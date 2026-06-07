package br.com.ecad.distribuicao.tests.application.queries.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.dto.DemonstrativoTitularResponse;
import br.com.ecad.distribuicao.application.queries.ConsultarDemonstrativoTitularQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ConsultarDemonstrativoTitularQueryHandler;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.CategoriaCredito;
import br.com.ecad.distribuicao.domain.enums.MotivoRetencao;
import br.com.ecad.distribuicao.domain.enums.StatusCredito;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConsultarDemonstrativoTitularQueryHandlerTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TITULAR_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private CreditoRepository creditoRepository;

    private ConsultarDemonstrativoTitularQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ConsultarDemonstrativoTitularQueryHandler(processoRepository, creditoRepository);
    }

    @Test
    void handle_TitularSemCreditos_ShouldThrowNotFoundException() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo()));
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.CALCULADO)))
                .thenReturn(List.of());
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.RETIDO)))
                .thenReturn(List.of());
        when(creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(eq(PROCESSO_ID), eq(TITULAR_ID)))
                .thenReturn(List.of());

        assertThatThrownBy(() -> handler.handle(new ConsultarDemonstrativoTitularQuery(PROCESSO_ID, TITULAR_ID)))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(TITULAR_ID.toString());
    }

    @Test
    void handle_CreditosEmTodosOsStatus_ShouldRetornarSecoesCorretas() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo()));
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.CALCULADO)))
                .thenReturn(List.of(credito(StatusCredito.CALCULADO, BigDecimal.valueOf(100)), credito(StatusCredito.CALCULADO, BigDecimal.valueOf(200))));
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.RETIDO)))
                .thenReturn(List.of(credito(StatusCredito.RETIDO, BigDecimal.valueOf(150))));
        when(creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(eq(PROCESSO_ID), eq(TITULAR_ID)))
                .thenReturn(List.of(credito(StatusCredito.LIBERADO, BigDecimal.valueOf(50))));

        DemonstrativoTitularResponse response = handler.handle(
                new ConsultarDemonstrativoTitularQuery(PROCESSO_ID, TITULAR_ID));

        assertThat(response.creditosPeriodo()).hasSize(2);
        assertThat(response.creditosRetidos()).hasSize(1);
        assertThat(response.creditosLiberados()).hasSize(1);
    }

    @Test
    void handle_TotaisFinanceiros_ShouldCalcularCorretamente() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo()));
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.CALCULADO)))
                .thenReturn(List.of(credito(StatusCredito.CALCULADO, new BigDecimal("600.00"))));
        when(creditoRepository.findByProcessoAndTitularAndStatus(eq(PROCESSO_ID), eq(TITULAR_ID), eq(StatusCredito.RETIDO)))
                .thenReturn(List.of(credito(StatusCredito.RETIDO, new BigDecimal("150.00"))));
        when(creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(eq(PROCESSO_ID), eq(TITULAR_ID)))
                .thenReturn(List.of(credito(StatusCredito.LIBERADO, new BigDecimal("200.00"))));

        DemonstrativoTitularResponse response = handler.handle(
                new ConsultarDemonstrativoTitularQuery(PROCESSO_ID, TITULAR_ID));

        assertThat(response.resumo().totalAReceber()).isEqualTo("800.00");
        assertThat(response.resumo().totalCalculado()).isEqualTo("600.00");
        assertThat(response.resumo().totalRetido()).isEqualTo("150.00");
        assertThat(response.resumo().totalLiberado()).isEqualTo("200.00");
    }

    @Test
    void handle_Secao4Ajustes_ShouldSempreVazia() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo()));
        when(creditoRepository.findByProcessoAndTitularAndStatus(any(), any(), any()))
                .thenReturn(List.of(credito(StatusCredito.CALCULADO, BigDecimal.TEN)));
        when(creditoRepository.findLiberadosByProcessoLiberacaoAndTitular(any(), any()))
                .thenReturn(List.of());

        DemonstrativoTitularResponse response = handler.handle(
                new ConsultarDemonstrativoTitularQuery(PROCESSO_ID, TITULAR_ID));

        assertThat(response.ajustesEstorno()).isEmpty();
        assertThat(response.totalAjustesEstorno()).isEqualTo("0.00");
    }

    private ProcessoDistribuicao processo() {
        return ProcessoDistribuicao.criar(
                "RADIO", "2026-05", BigDecimal.valueOf(1000), "analista",
                UUID.randomUUID(), UUID.randomUUID());
    }

    private Credito credito(StatusCredito status, BigDecimal valor) {
        if (status == StatusCredito.CALCULADO) {
            return Credito.calculado(
                    PROCESSO_ID, TITULAR_ID, "Titular",
                    UUID.randomUUID(), "Obra", null,
                    CategoriaCredito.AUTORAL, null,
                    new BigDecimal("100.000000"),
                    new BigDecimal("1000.00"), valor,
                    new BigDecimal("10.000000"),
                    Instant.parse("2026-05-07T10:30:00Z"));
        }
        if (status == StatusCredito.RETIDO) {
            return Credito.retido(
                    PROCESSO_ID, TITULAR_ID, "Titular",
                    UUID.randomUUID(), "Obra", null,
                    CategoriaCredito.AUTORAL, null,
                    new BigDecimal("100.000000"),
                    new BigDecimal("1000.00"), valor,
                    new BigDecimal("10.000000"),
                    MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                    Instant.now(),
                    Instant.parse("2026-05-07T10:30:00Z"));
        }
        // LIBERADO
        Credito retido = Credito.retido(
                UUID.randomUUID(), TITULAR_ID, "Titular",
                UUID.randomUUID(), "Obra", null,
                CategoriaCredito.AUTORAL, null,
                new BigDecimal("100.000000"),
                new BigDecimal("1000.00"), valor,
                new BigDecimal("10.000000"),
                MotivoRetencao.TITULAR_SEM_ASSOCIACAO,
                Instant.now(),
                Instant.parse("2026-05-07T10:30:00Z"));
        retido.liberar(PROCESSO_ID, Instant.now());
        return retido;
    }
}
