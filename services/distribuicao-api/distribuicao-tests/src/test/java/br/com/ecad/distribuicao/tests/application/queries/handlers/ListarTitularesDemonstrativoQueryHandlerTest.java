package br.com.ecad.distribuicao.tests.application.queries.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.dto.CalculoProcessoResponse;
import br.com.ecad.distribuicao.application.dto.TitularDemonstrativoResumoResponse;
import br.com.ecad.distribuicao.application.dto.TitularesDemonstrativoPageResponse;
import br.com.ecad.distribuicao.application.queries.ListarTitularesDemonstrativoQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ListarTitularesDemonstrativoQueryHandler;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.projections.TitularDemonstrativoProjection;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ListarTitularesDemonstrativoQueryHandlerTest {

    private static final UUID PROCESSO_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TITULAR_1 = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID TITULAR_2 = UUID.fromString("00000000-0000-0000-0000-000000000102");

    @Mock
    private ProcessoRepository processoRepository;

    @Mock
    private CreditoRepository creditoRepository;

    private ListarTitularesDemonstrativoQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ListarTitularesDemonstrativoQueryHandler(processoRepository, creditoRepository);
    }

    @Test
    void handle_ProcessoNaoEncontrado_ShouldThrowNotFoundException() {
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.handle(new ListarTitularesDemonstrativoQuery(
                PROCESSO_ID, null, 0, 20, "nome")))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Processo");
    }

    @Test
    void handle_ListagemComFiltroEmergeLiberados_ShouldRetornarTotaisCorretos() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", BigDecimal.valueOf(1000), "analista",
                UUID.randomUUID(), UUID.randomUUID());
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(creditoRepository.findTitularesByProcessoId(eq(PROCESSO_ID), eq("silva"), any(Pageable.class)))
                .thenReturn(List.of(
                        projection(TITULAR_1, "Joao Silva", "100.00", "10.00", 2),
                        projection(TITULAR_2, "Ana Silva", "200.00", "20.00", 3)));
        when(creditoRepository.countTitularesByProcessoId(PROCESSO_ID, "silva")).thenReturn(2L);
        when(creditoRepository.sumLiberadosByProcessoLiberacaoId(PROCESSO_ID))
                .thenReturn(Map.of(TITULAR_1, new BigDecimal("50.00")));

        TitularesDemonstrativoPageResponse response = handler.handle(
                new ListarTitularesDemonstrativoQuery(PROCESSO_ID, "silva", 0, 20, "nome"));

        assertThat(response.items()).hasSize(2);
        TitularDemonstrativoResumoResponse t1 = response.items().get(0);
        assertThat(t1.totalLiberado()).isEqualTo("50.00");
        assertThat(t1.totalAReceber()).isEqualTo("150.00");
        TitularDemonstrativoResumoResponse t2 = response.items().get(1);
        assertThat(t2.totalLiberado()).isEqualTo("0.00");
        assertThat(t2.totalAReceber()).isEqualTo("200.00");
    }

    @Test
    void handle_OrdenacaoPorTotalAReceber_ShouldRetornarMaiorPrimeiro() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", BigDecimal.valueOf(1000), "analista",
                UUID.randomUUID(), UUID.randomUUID());
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(creditoRepository.findTitularesByProcessoId(eq(PROCESSO_ID), any(), any(Pageable.class)))
                .thenReturn(List.of(
                        projection(TITULAR_1, "Joao", "100.00", "0.00", 1),
                        projection(TITULAR_2, "Ana", "300.00", "0.00", 1),
                        projection(UUID.randomUUID(), "Beto", "200.00", "0.00", 1)));
        when(creditoRepository.countTitularesByProcessoId(PROCESSO_ID, null)).thenReturn(3L);
        when(creditoRepository.sumLiberadosByProcessoLiberacaoId(PROCESSO_ID))
                .thenReturn(Map.of());

        TitularesDemonstrativoPageResponse response = handler.handle(
                new ListarTitularesDemonstrativoQuery(PROCESSO_ID, null, 0, 20, "totalAReceber"));

        assertThat(response.items().get(0).titularNome()).isEqualTo("Ana");
        assertThat(response.items().get(0).totalAReceber()).isEqualTo("300.00");
    }

    @Test
    void handle_ProcessoSemTitulares_ShouldRetornarPaginaVazia() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO", "2026-05", BigDecimal.valueOf(1000), "analista",
                UUID.randomUUID(), UUID.randomUUID());
        when(processoRepository.findById(PROCESSO_ID)).thenReturn(Optional.of(processo));
        when(creditoRepository.findTitularesByProcessoId(eq(PROCESSO_ID), any(), any(Pageable.class)))
                .thenReturn(List.of());
        when(creditoRepository.countTitularesByProcessoId(PROCESSO_ID, null)).thenReturn(0L);
        when(creditoRepository.sumLiberadosByProcessoLiberacaoId(PROCESSO_ID))
                .thenReturn(Map.of());

        TitularesDemonstrativoPageResponse response = handler.handle(
                new ListarTitularesDemonstrativoQuery(PROCESSO_ID, null, 0, 20, "nome"));

        assertThat(response.items()).isEmpty();
        assertThat(response.metadata().total()).isZero();
    }

    private TitularDemonstrativoProjection projection(
            UUID titularId, String nome, String totalCalculado, String totalRetido, long qtdObras) {
        return new TitularDemonstrativoProjection(
                titularId, nome,
                new BigDecimal(totalCalculado),
                new BigDecimal(totalRetido),
                qtdObras);
    }
}
