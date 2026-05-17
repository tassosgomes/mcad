package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarCalculoProcessoQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ConsultarCalculoProcessoQueryHandler;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.filters.CreditoFiltro;
import br.com.ecad.distribuicao.domain.interfaces.CreditoLiberacaoRepository;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.projections.CalculoResumoProjection;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ConsultarCalculoProcessoQueryHandlerTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TITULAR_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID OBRA_ID = UUID.fromString("00000000-0000-0000-0000-000000000201");

    @Mock
    private CreditoRepository creditoRepository;

    @Mock
    private CreditoLiberacaoRepository creditoLiberacaoRepository;

    @Mock
    private ProcessoRepository processoRepository;

    private ConsultarCalculoProcessoQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ConsultarCalculoProcessoQueryHandler(
                creditoRepository,
                creditoLiberacaoRepository,
                processoRepository);
        org.mockito.Mockito.lenient()
                .when(creditoLiberacaoRepository.findByProcessoLiberacaoId(PROCESSO_ID))
                .thenReturn(List.of());
    }

    @Test
    void handle_WithCalculatedProcess_ShouldMapSummaryAndCreditPage() {
        CalculoResumoProjection resumo = resumo();
        Credito credito = credito();
        when(creditoRepository.buscarResumo(PROCESSO_ID)).thenReturn(Optional.of(resumo));
        when(creditoRepository.findByProcessoId(any(CreditoFiltro.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(credito), PageRequest.of(0, 1), 2));

        CalculoProcessoResponse response = handler.handle(new ConsultarCalculoProcessoQuery(
                PROCESSO_ID,
                0,
                1,
                "AUTORAL",
                TITULAR_ID,
                OBRA_ID,
                "RETIDO",
                "TITULAR_SEM_ASSOCIACAO"));

        assertThat(response.processoId()).isEqualTo(PROCESSO_ID);
        assertThat(response.status()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(response.resumo().verbaLiquida()).isEqualByComparingTo("1000.00");
        assertThat(response.resumo().totalExecucoes()).isEqualTo(10);
        assertThat(response.resumo().totalPontos()).isEqualByComparingTo("10.000000");
        assertThat(response.resumo().totalObras()).isEqualTo(1);
        assertThat(response.resumo().totalCreditos()).isEqualTo(2);
        assertThat(response.creditos().items()).hasSize(1);
        assertThat(response.creditos().items().getFirst().titularId()).isEqualTo(TITULAR_ID);
        assertThat(response.creditos().items().getFirst().valorCredito()).isEqualByComparingTo("1000.00");
        assertThat(response.creditos().metadata().page()).isZero();
        assertThat(response.creditos().metadata().size()).isOne();
        assertThat(response.creditos().metadata().total()).isEqualTo(2);
        assertThat(response.creditos().metadata().totalPages()).isEqualTo(2);

        ArgumentCaptor<CreditoFiltro> filtroCaptor = ArgumentCaptor.forClass(CreditoFiltro.class);
        verify(creditoRepository).findByProcessoId(filtroCaptor.capture(), any(PageRequest.class));
        assertThat(filtroCaptor.getValue().categoria()).isEqualTo(CategoriaCredito.AUTORAL);
        assertThat(filtroCaptor.getValue().titularId()).isEqualTo(TITULAR_ID);
        assertThat(filtroCaptor.getValue().obraId()).isEqualTo(OBRA_ID);
        assertThat(filtroCaptor.getValue().status()).isEqualTo(StatusCredito.RETIDO);
        assertThat(filtroCaptor.getValue().motivoRetencao()).isEqualTo(MotivoRetencao.TITULAR_SEM_ASSOCIACAO);
    }

    @Test
    void handle_WithInvalidCategoria_ShouldRejectBeforeRepositoryQuery() {
        ConsultarCalculoProcessoQuery query = new ConsultarCalculoProcessoQuery(
                PROCESSO_ID,
                0,
                20,
                "INVALIDA",
                null,
                null,
                null,
                null);

        assertThatThrownBy(() -> handler.handle(query))
                .isInstanceOf(PreRequisitosException.class)
                .hasMessageContaining("Categoria de crédito inválida");
        verify(creditoRepository, never()).buscarResumo(any());
        verify(creditoRepository, never()).findByProcessoId(any(), any());
    }

    private CalculoResumoProjection resumo() {
        return new CalculoResumoProjection(
                PROCESSO_ID,
                StatusProcesso.CALCULADO,
                "RADIO",
                "2026-05",
                new BigDecimal("1000.00"),
                10,
                1,
                new BigDecimal("10.000000"),
                2,
                new BigDecimal("1000.00"),
                0,
                BigDecimal.ZERO,
                0,
                BigDecimal.ZERO,
                Instant.parse("2026-05-07T10:30:00Z"));
    }

    private Credito credito() {
        return Credito.calculado(
                PROCESSO_ID,
                TITULAR_ID,
                "Titular Autoral",
                OBRA_ID,
                "Obra Calculada",
                null,
                CategoriaCredito.AUTORAL,
                null,
                new BigDecimal("100.000000"),
                new BigDecimal("1000.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("10.000000"),
                Instant.parse("2026-05-07T10:30:00Z"));
    }
}
