package br.com.ecad.arrecadacao.infra.services;

import br.com.ecad.arrecadacao.domain.aggregates.PagamentoAgregado;
import br.com.ecad.arrecadacao.domain.entities.Rubrica;
import br.com.ecad.arrecadacao.domain.entities.Verba;
import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.PagamentoRepository;
import br.com.ecad.arrecadacao.domain.interfaces.RubricaRepository;
import br.com.ecad.arrecadacao.domain.interfaces.VerbaRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerbaServiceImplTest {

    @Mock
    private VerbaRepository verbaRepository;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private RubricaRepository rubricaRepository;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    // MeterRegistry real para evitar stubbing complexo de fluent Counter.Builder
    private final MeterRegistry meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();

    private VerbaServiceImpl verbaService;

    private static final UUID RUBRICA_ID = UUID.randomUUID();
    private static final String PERIODO = "2026-04";
    private static final String RUBRICA_SIGLA = "RADIO";
    private static final String RUBRICA_NOME = "Radio";

    @BeforeEach
    void setUp() {
        verbaService = new VerbaServiceImpl(
                verbaRepository,
                pagamentoRepository,
                rubricaRepository,
                outboxEventWriter,
                meterRegistry
        );
    }

    // ── recalcularVerba ────────────────────────────────────────────────────────

    /**
     * (a) Verba inexistente → deve criar nova via Verba.abrir e chamar save com novo agregado;
     * evento Outbox deve ser emitido.
     */
    @Test
    void recalcularVerba_VerbaInexistente_DeveCriarComVerbaAbrir() {
        // Arrange
        when(verbaRepository.findByRubricaIdAndPeriodoForUpdate(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.empty());

        PagamentoAgregado agregado = new PagamentoAgregado(new BigDecimal("1000.00"), 5);
        when(pagamentoRepository.sumAndCountConfirmados(RUBRICA_ID, PERIODO)).thenReturn(agregado);

        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, RUBRICA_NOME, false);
        when(rubricaRepository.findById(RUBRICA_ID)).thenReturn(Optional.of(rubrica));

        // Simular save retornando a mesma verba passada
        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        verbaService.recalcularVerba(RUBRICA_ID, PERIODO);

        // Assert — save foi chamado com verba nova (não vazia após recalcular)
        ArgumentCaptor<Verba> verbaCaptor = ArgumentCaptor.forClass(Verba.class);
        verify(verbaRepository).save(verbaCaptor.capture());
        Verba verbasSalva = verbaCaptor.getValue();
        assertThat(verbasSalva.getRubricaId()).isEqualTo(RUBRICA_ID);
        assertThat(verbasSalva.getPeriodo()).isEqualTo(PERIODO);
        assertThat(verbasSalva.getValorBrutoTotal()).isEqualByComparingTo("1000.00");
        assertThat(verbasSalva.getVerbaLiquida()).isEqualByComparingTo("850.00");
        assertThat(verbasSalva.getQuantidadePagamentos()).isEqualTo(5);
        assertThat(verbasSalva.getStatus()).isEqualTo(StatusVerba.ABERTA);

        // Evento Outbox emitido
        verify(outboxEventWriter).addEvent(
                eq("arrecadacao.verba.disponivel"),
                eq("RADIO:2026-04"),
                any());
    }

    /**
     * (b) Verba existente → mesma instância deve ser salva com novos valores recalculados.
     */
    @Test
    void recalcularVerba_VerbaExistente_DeveAtualizar() {
        // Arrange — verba já existente no banco
        Verba verbaExistente = Verba.abrir(RUBRICA_ID, PERIODO);
        verbaExistente.recalcular(new BigDecimal("500.00"), 2);

        when(verbaRepository.findByRubricaIdAndPeriodoForUpdate(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.of(verbaExistente));

        PagamentoAgregado agregadoNovo = new PagamentoAgregado(new BigDecimal("1500.00"), 7);
        when(pagamentoRepository.sumAndCountConfirmados(RUBRICA_ID, PERIODO)).thenReturn(agregadoNovo);

        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, RUBRICA_NOME, false);
        when(rubricaRepository.findById(RUBRICA_ID)).thenReturn(Optional.of(rubrica));

        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        verbaService.recalcularVerba(RUBRICA_ID, PERIODO);

        // Assert — mesma instância foi salva com valores atualizados
        ArgumentCaptor<Verba> verbaCaptor = ArgumentCaptor.forClass(Verba.class);
        verify(verbaRepository).save(verbaCaptor.capture());
        Verba verbaSalva = verbaCaptor.getValue();
        assertThat(verbaSalva.getValorBrutoTotal()).isEqualByComparingTo("1500.00");
        assertThat(verbaSalva.getVerbaLiquida()).isEqualByComparingTo("1275.00");
        assertThat(verbaSalva.getQuantidadePagamentos()).isEqualTo(7);

        // Evento Outbox emitido com novos valores
        verify(outboxEventWriter).addEvent(
                eq("arrecadacao.verba.disponivel"),
                eq("RADIO:2026-04"),
                any());
    }

    /**
     * (c) Verba EM_DISTRIBUICAO → recalcular lança VerbaEmDistribuicaoException que deve propagar.
     */
    @Test
    void recalcularVerba_VerbaEmDistribuicao_DevePropagar() {
        // Arrange — verba com status EM_DISTRIBUICAO
        Verba verbaEmDistribuicao = Verba.abrir(RUBRICA_ID, PERIODO);
        verbaEmDistribuicao.marcarEmDistribuicao();

        when(verbaRepository.findByRubricaIdAndPeriodoForUpdate(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.of(verbaEmDistribuicao));

        PagamentoAgregado agregado = new PagamentoAgregado(new BigDecimal("500.00"), 2);
        when(pagamentoRepository.sumAndCountConfirmados(RUBRICA_ID, PERIODO)).thenReturn(agregado);

        // Act / Assert
        assertThatThrownBy(() -> verbaService.recalcularVerba(RUBRICA_ID, PERIODO))
                .isInstanceOf(VerbaEmDistribuicaoException.class)
                .hasMessageContaining("EM_DISTRIBUICAO");

        // Save e evento não devem ser chamados
        verify(verbaRepository, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(anyString(), anyString(), any());
    }

    /**
     * (d) Estorno total → agregado retorna (ZERO, 0); verba é salva com zeros;
     * evento Outbox é emitido com bruto/líquida=0 (RF-10).
     */
    @Test
    void recalcularVerba_EstornoTotal_DeveEmitirEventoComZero() {
        // Arrange — verba com valor existente, estornada totalmente
        Verba verbaExistente = Verba.abrir(RUBRICA_ID, PERIODO);
        verbaExistente.recalcular(new BigDecimal("1000.00"), 3);

        when(verbaRepository.findByRubricaIdAndPeriodoForUpdate(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.of(verbaExistente));

        // Agregado zerado — todos os pagamentos foram estornados
        PagamentoAgregado agregadoZero = new PagamentoAgregado(BigDecimal.ZERO, 0);
        when(pagamentoRepository.sumAndCountConfirmados(RUBRICA_ID, PERIODO)).thenReturn(agregadoZero);

        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, RUBRICA_NOME, false);
        when(rubricaRepository.findById(RUBRICA_ID)).thenReturn(Optional.of(rubrica));

        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        verbaService.recalcularVerba(RUBRICA_ID, PERIODO);

        // Assert — verba salva com zeros
        ArgumentCaptor<Verba> verbaCaptor = ArgumentCaptor.forClass(Verba.class);
        verify(verbaRepository).save(verbaCaptor.capture());
        Verba verbaSalva = verbaCaptor.getValue();
        assertThat(verbaSalva.getValorBrutoTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verbaSalva.getVerbaLiquida()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verbaSalva.getQuantidadePagamentos()).isZero();

        // Evento emitido mesmo com zeros (RF-10)
        verify(outboxEventWriter).addEvent(
                eq("arrecadacao.verba.disponivel"),
                eq("RADIO:2026-04"),
                any());
    }

    // ── validarLockParaAlteracao ───────────────────────────────────────────────

    /**
     * (e) Verba inexistente → no-op, sem exceção.
     */
    @Test
    void validarLockParaAlteracao_VerbaInexistente_NoOp() {
        // Arrange
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.empty());

        // Act / Assert — não lança exceção
        verbaService.validarLockParaAlteracao(RUBRICA_ID, PERIODO);

        verify(rubricaRepository, never()).findById(any());
    }

    /**
     * (f) Verba com status ABERTA → no-op, sem exceção.
     */
    @Test
    void validarLockParaAlteracao_StatusAberta_NoOp() {
        // Arrange — verba ABERTA
        Verba verbaAberta = Verba.abrir(RUBRICA_ID, PERIODO);
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.of(verbaAberta));

        // Act / Assert — não lança exceção
        verbaService.validarLockParaAlteracao(RUBRICA_ID, PERIODO);

        verify(rubricaRepository, never()).findById(any());
    }

    /**
     * (g) Verba EM_DISTRIBUICAO → lança VerbaEmDistribuicaoException com mensagem
     * contendo sigla, período e status.
     */
    @Test
    void validarLockParaAlteracao_StatusEmDistribuicao_DeveLancar() {
        // Arrange
        Verba verbaEmDistribuicao = Verba.abrir(RUBRICA_ID, PERIODO);
        verbaEmDistribuicao.marcarEmDistribuicao();
        when(verbaRepository.findByRubricaIdAndPeriodo(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.of(verbaEmDistribuicao));

        Rubrica rubrica = new Rubrica(RUBRICA_ID, RUBRICA_SIGLA, RUBRICA_NOME, false);
        when(rubricaRepository.findById(RUBRICA_ID)).thenReturn(Optional.of(rubrica));

        // Act / Assert
        assertThatThrownBy(() -> verbaService.validarLockParaAlteracao(RUBRICA_ID, PERIODO))
                .isInstanceOf(VerbaEmDistribuicaoException.class)
                .hasMessageContaining(RUBRICA_SIGLA)
                .hasMessageContaining(PERIODO)
                .hasMessageContaining("EM_DISTRIBUICAO");
    }

    /**
     * (h) Evento publicado com subject formatado "{sigla}:{periodo}" e payload com todos os campos RF-09.
     */
    @Test
    @SuppressWarnings("unchecked")
    void recalcularVerba_DevePublicarEventoComSubjectFormatado() {
        // Arrange
        when(verbaRepository.findByRubricaIdAndPeriodoForUpdate(RUBRICA_ID, PERIODO))
                .thenReturn(Optional.empty());

        PagamentoAgregado agregado = new PagamentoAgregado(new BigDecimal("1073.10"), 3);
        when(pagamentoRepository.sumAndCountConfirmados(RUBRICA_ID, PERIODO)).thenReturn(agregado);

        Rubrica rubrica = new Rubrica(RUBRICA_ID, "RADIO", "Radio Comercial", false);
        when(rubricaRepository.findById(RUBRICA_ID)).thenReturn(Optional.of(rubrica));

        when(verbaRepository.save(any(Verba.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        verbaService.recalcularVerba(RUBRICA_ID, PERIODO);

        // Assert — subject e payload
        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        verify(outboxEventWriter).addEvent(
                eq("arrecadacao.verba.disponivel"),
                subjectCaptor.capture(),
                payloadCaptor.capture());

        assertThat(subjectCaptor.getValue()).isEqualTo("RADIO:2026-04");

        Map<String, Object> payload = (Map<String, Object>) payloadCaptor.getValue();
        assertThat(payload).containsKey("rubricaSigla");
        assertThat(payload).containsKey("rubricaNome");
        assertThat(payload).containsKey("periodo");
        assertThat(payload).containsKey("valorBrutoTotal");
        assertThat(payload).containsKey("deducaoEcad");
        assertThat(payload).containsKey("deducaoAssociacoes");
        assertThat(payload).containsKey("verbaLiquida");
        assertThat(payload).containsKey("quantidadePagamentos");
        assertThat(payload).containsKey("status");

        assertThat(payload.get("rubricaSigla")).isEqualTo("RADIO");
        assertThat(payload.get("rubricaNome")).isEqualTo("Radio Comercial");
        assertThat(payload.get("periodo")).isEqualTo("2026-04");
        assertThat(payload.get("valorBrutoTotal")).isEqualTo("1073.10");
        // deducaoEcad = 1073.10 * 0.10 = 107.31
        assertThat(payload.get("deducaoEcad")).isEqualTo("107.31");
        // deducaoAssociacoes = 1073.10 * 0.05 = 53.655 → HALF_UP → 53.66
        assertThat(payload.get("deducaoAssociacoes")).isEqualTo("53.66");
        // verbaLiquida = 1073.10 - 107.31 - 53.66 = 912.13
        assertThat(payload.get("verbaLiquida")).isEqualTo("912.13");
        assertThat(payload.get("quantidadePagamentos")).isEqualTo(3);
        assertThat(payload.get("status")).isEqualTo("ABERTA");
    }
}
