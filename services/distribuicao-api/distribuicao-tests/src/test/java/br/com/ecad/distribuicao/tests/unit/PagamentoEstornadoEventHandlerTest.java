package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstornoHistorico;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusAjusteEstorno;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoHistoricoRepository;
import br.com.ecad.distribuicao.domain.interfaces.AjusteEstornoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.infra.events.PagamentoEstornadoEventHandler;
import br.com.ecad.distribuicao.infra.events.PagamentoEstornadoEventPayload;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PagamentoEstornadoEventHandlerTest {

    private static final Instant FIXED_NOW = Instant.parse("2026-06-07T10:00:00Z");
    private static final UUID EVENTO_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID PAGAMENTO_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID LICENCA_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID PROCESSO_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");

    @Mock
    private AjusteEstornoRepository ajusteRepo;
    @Mock
    private AjusteEstornoHistoricoRepository historicoRepo;
    @Mock
    private ProcessoRepository processoRepo;
    @Mock
    private OutboxEventWriter outboxEventWriter;

    private PagamentoEstornadoEventHandler handler;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        handler = new PagamentoEstornadoEventHandler(
                ajusteRepo, historicoRepo, processoRepo, outboxEventWriter, fixedClock);

        // Lenient stubs: some tests override these, others don't use all of them
        org.mockito.Mockito.lenient().when(ajusteRepo.findByEventId(any())).thenReturn(Optional.empty());
        org.mockito.Mockito.lenient().when(ajusteRepo.findByPagamentoId(any())).thenReturn(Optional.empty());
        org.mockito.Mockito.lenient().when(ajusteRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(historicoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void handle_SemProcessoEncontrado_SalvaIgnoradoSemDistribuicao_SemOutbox() {
        when(processoRepo.findAtivoByRubricaSiglaAndPeriodo("RADIO", "2026-04"))
                .thenReturn(Optional.empty());

        handler.handle(payload(), "{}");

        ArgumentCaptor<AjusteEstorno> captor = ArgumentCaptor.forClass(AjusteEstorno.class);
        verify(ajusteRepo).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(StatusAjusteEstorno.IGNORADO_SEM_DISTRIBUICAO);
        assertThat(captor.getValue().getProcessoOrigemId()).isNull();
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
        verify(historicoRepo).save(any(AjusteEstornoHistorico.class));
    }

    @Test
    void handle_ProcessoCRIADO_SalvaProcessoCriadoDesatualizado_SemOutbox() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CRIADO);
        when(processoRepo.findAtivoByRubricaSiglaAndPeriodo("RADIO", "2026-04"))
                .thenReturn(Optional.of(processo));

        handler.handle(payload(), "{}");

        ArgumentCaptor<AjusteEstorno> captor = ArgumentCaptor.forClass(AjusteEstorno.class);
        verify(ajusteRepo).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(StatusAjusteEstorno.PROCESSO_CRIADO_DESATUALIZADO);
        assertThat(captor.getValue().getProcessoOrigemId()).isEqualTo(PROCESSO_ID);
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    @ParameterizedTest
    @EnumSource(value = StatusProcesso.class, names = {"CALCULADO", "APROVADO", "FINALIZADO"})
    void handle_ProcessoElegivel_SalvaPendenteAplicacao_PublicaOutbox(StatusProcesso status) {
        ProcessoDistribuicao processo = processo(status);
        when(processoRepo.findAtivoByRubricaSiglaAndPeriodo("RADIO", "2026-04"))
                .thenReturn(Optional.of(processo));

        handler.handle(payload(), "{}");

        ArgumentCaptor<AjusteEstorno> captor = ArgumentCaptor.forClass(AjusteEstorno.class);
        verify(ajusteRepo).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(StatusAjusteEstorno.PENDENTE_APLICACAO);
        assertThat(captor.getValue().getProcessoOrigemId()).isEqualTo(PROCESSO_ID);
        verify(outboxEventWriter).addEvent(
                argThat(type -> type.equals("distribuicao.ajuste.estorno.registrado")),
                any(),
                any());
    }

    @Test
    void handle_Redelivery_MesmoEventId_SalveNaoEChamado() {
        AjusteEstorno existente = AjusteEstorno.ignoradoSemDistribuicao(
                payload().toEventoEstorno(), "{}", new BigDecimal("85.00"));
        when(ajusteRepo.findByEventId(EVENTO_ID)).thenReturn(Optional.of(existente));

        handler.handle(payload(), "{}");

        verify(ajusteRepo, never()).save(any());
        verify(outboxEventWriter, never()).addEvent(any(), any(), any());
    }

    @Test
    void handle_MesmoPagamentoIdPayloadDivergente_PrimeiroRegistroMantido_SaveNaoChamado() {
        // Simula registro existente com mesmos dados essenciais para isPayloadEquivalente == false
        AjusteEstorno existente = ajusteComCampos(PAGAMENTO_ID, new BigDecimal("999.99"), "TV_ABERTA", "2026-03");
        when(ajusteRepo.findByEventId(any())).thenReturn(Optional.empty());
        when(ajusteRepo.findByPagamentoId(PAGAMENTO_ID)).thenReturn(Optional.of(existente));
        // payload com valorEstornado=100.00, rubrica=RADIO, periodo=2026-04 — divergente

        handler.handle(payload(), "{}");

        // save não deve ser chamado para o segundo registro
        verify(ajusteRepo, never()).save(any());
    }

    @Test
    void handle_CalculoValorLiquido_ValorEstornado1000_ViraValorLiquido850() {
        ProcessoDistribuicao processo = processo(StatusProcesso.CALCULADO);
        when(processoRepo.findAtivoByRubricaSiglaAndPeriodo("RADIO", "2026-04"))
                .thenReturn(Optional.of(processo));

        PagamentoEstornadoEventPayload payloadBig = new PagamentoEstornadoEventPayload(
                EVENTO_ID,
                PAGAMENTO_ID,
                LICENCA_ID,
                "RADIO",
                "2026-04",
                new BigDecimal("10.000000"),
                new BigDecimal("1000.00"),
                "justificativa",
                "analista@ecad.org",
                Instant.parse("2026-06-01T10:00:00Z"));

        handler.handle(payloadBig, "{}");

        ArgumentCaptor<AjusteEstorno> captor = ArgumentCaptor.forClass(AjusteEstorno.class);
        verify(ajusteRepo).save(captor.capture());
        assertThat(captor.getValue().getValorAjusteLiquido()).isEqualByComparingTo("850.00");
    }

    @Test
    void handle_HistoricoInicialSempreSalvo() {
        when(processoRepo.findAtivoByRubricaSiglaAndPeriodo("RADIO", "2026-04"))
                .thenReturn(Optional.empty());

        handler.handle(payload(), "{}");

        verify(historicoRepo).save(any(AjusteEstornoHistorico.class));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private PagamentoEstornadoEventPayload payload() {
        return new PagamentoEstornadoEventPayload(
                EVENTO_ID,
                PAGAMENTO_ID,
                LICENCA_ID,
                "RADIO",
                "2026-04",
                new BigDecimal("10.000000"),
                new BigDecimal("100.00"),
                "justificativa",
                "analista@ecad.org",
                Instant.parse("2026-06-01T10:00:00Z"));
    }

    private ProcessoDistribuicao processo(StatusProcesso status) {
        ProcessoDistribuicao p = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", new BigDecimal("1000.00"), "analista", null, null);
        setField(p, "id", PROCESSO_ID);
        if (status == StatusProcesso.CALCULADO || status == StatusProcesso.APROVADO
                || status == StatusProcesso.FINALIZADO) {
            p.marcarCalculado(10);
        }
        if (status == StatusProcesso.APROVADO || status == StatusProcesso.FINALIZADO) {
            p.aprovar();
        }
        if (status == StatusProcesso.FINALIZADO) {
            p.finalizar();
        }
        return p;
    }

    private AjusteEstorno ajusteComCampos(
            UUID pagamentoId, BigDecimal valorBruto, String rubrica, String periodo) {
        // Cria um ajuste com campos divergentes para testar isPayloadEquivalente
        br.com.ecad.distribuicao.domain.entities.EventoEstorno eventoDiv =
                new br.com.ecad.distribuicao.domain.entities.EventoEstorno(
                        UUID.randomUUID(), pagamentoId, UUID.randomUUID(),
                        rubrica, periodo,
                        new BigDecimal("10.000000"), valorBruto,
                        "justificativa", "analista@ecad.org",
                        Instant.parse("2026-06-01T10:00:00Z"));
        return AjusteEstorno.ignoradoSemDistribuicao(eventoDiv, "{}", valorBruto.multiply(new BigDecimal("0.85")));
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set field " + fieldName, e);
        }
    }
}
