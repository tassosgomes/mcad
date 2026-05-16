package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import br.com.ecad.distribuicao.application.dto.DisponibilidadeResponse;
import br.com.ecad.distribuicao.application.queries.ListarDisponiveisQuery;
import br.com.ecad.distribuicao.application.queries.handlers.ListarDisponiveisQueryHandler;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotListPort;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ListarDisponiveisQueryHandlerTest {

    @Mock private SnapshotListPort snapshotListPort;
    @Mock private ProcessoRepository processoRepository;

    private ListarDisponiveisQueryHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ListarDisponiveisQueryHandler(snapshotListPort, processoRepository);
    }

    @Test
    void handle_ComRolVerbaESemProcessoAtivo_ShouldRetornarCombinacaoDisponivel() {
        when(snapshotListPort.findAllRolAtivos()).thenReturn(List.of(
                rol("RADIO", "2026-03", 100)));
        when(snapshotListPort.findAllVerbas()).thenReturn(List.of(
                verba("RADIO", "2026-03", BigDecimal.valueOf(85000))));
        when(processoRepository.findAtivos()).thenReturn(List.of());

        List<DisponibilidadeResponse> result = handler.handle(new ListarDisponiveisQuery());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).rubricaSigla()).isEqualTo("RADIO");
        assertThat(result.get(0).periodo()).isEqualTo("2026-03");
        assertThat(result.get(0).verbaLiquida()).isEqualByComparingTo("85000");
        assertThat(result.get(0).totalExecucoes()).isEqualTo(100);
    }

    @Test
    void handle_ComProcessoAtivo_ShouldFiltrarCombinacao() {
        when(snapshotListPort.findAllRolAtivos()).thenReturn(List.of(
                rol("RADIO", "2026-03", 100)));
        when(snapshotListPort.findAllVerbas()).thenReturn(List.of(
                verba("RADIO", "2026-03", BigDecimal.valueOf(85000))));

        // Processo ativo (não cancelado) para RADIO/2026-03
        ProcessoDistribuicao processoAtivo = processoComStatus("RADIO", "2026-03", StatusProcesso.CALCULADO);
        when(processoRepository.findAtivos()).thenReturn(List.of(processoAtivo));

        List<DisponibilidadeResponse> result = handler.handle(new ListarDisponiveisQuery());

        // Deve filtrar: há processo ativo
        assertThat(result).isEmpty();
    }

    @Test
    void handle_ComProcessoCancelado_ShouldNaoFiltrar() {
        when(snapshotListPort.findAllRolAtivos()).thenReturn(List.of(
                rol("RADIO", "2026-03", 100)));
        when(snapshotListPort.findAllVerbas()).thenReturn(List.of(
                verba("RADIO", "2026-03", BigDecimal.valueOf(85000))));

        // Processo CANCELADO — não bloqueia nova criação
        ProcessoDistribuicao processoCancelado = processoComStatus("RADIO", "2026-03", StatusProcesso.CANCELADO);
        when(processoRepository.findAtivos()).thenReturn(List.of(processoCancelado));

        List<DisponibilidadeResponse> result = handler.handle(new ListarDisponiveisQuery());

        assertThat(result).hasSize(1);
    }

    @Test
    void handle_SemVerba_ShouldNaoRetornarCombinacao() {
        when(snapshotListPort.findAllRolAtivos()).thenReturn(List.of(
                rol("RADIO", "2026-03", 100)));
        when(snapshotListPort.findAllVerbas()).thenReturn(List.of()); // sem verba
        when(processoRepository.findAtivos()).thenReturn(List.of());

        List<DisponibilidadeResponse> result = handler.handle(new ListarDisponiveisQuery());

        assertThat(result).isEmpty();
    }

    @Test
    void handle_MultiplasCombinacoes_ShouldRetornarTodasDisponiveis() {
        when(snapshotListPort.findAllRolAtivos()).thenReturn(List.of(
                rol("RADIO", "2026-03", 100),
                rol("TV_ABERTA", "2026-03", 200)));
        when(snapshotListPort.findAllVerbas()).thenReturn(List.of(
                verba("RADIO", "2026-03", BigDecimal.valueOf(85000)),
                verba("TV_ABERTA", "2026-03", BigDecimal.valueOf(120000))));
        when(processoRepository.findAtivos()).thenReturn(List.of());

        List<DisponibilidadeResponse> result = handler.handle(new ListarDisponiveisQuery());

        assertThat(result).hasSize(2);
    }

    private SnapshotRol rol(String rubrica, String periodo, int totalExecucoes) {
        return new SnapshotRol(rubrica, periodo, UUID.randomUUID(), totalExecucoes, "{}", false, Instant.now());
    }

    private SnapshotVerba verba(String rubrica, String periodo, BigDecimal verbaLiquida) {
        return new SnapshotVerba(rubrica, periodo, verbaLiquida.multiply(BigDecimal.valueOf(1.2)),
                BigDecimal.valueOf(1000), BigDecimal.valueOf(500), verbaLiquida, Instant.now());
    }

    private ProcessoDistribuicao processoComStatus(String rubrica, String periodo, StatusProcesso status) {
        ProcessoDistribuicao p = ProcessoDistribuicao.criar(rubrica, periodo, BigDecimal.valueOf(85000),
                "analista", UUID.randomUUID(), UUID.randomUUID());
        if (status == StatusProcesso.CALCULADO) {
            p.marcarCalculado(100);
        } else if (status == StatusProcesso.CANCELADO) {
            p.cancelar("cancelado por teste");
        }
        return p;
    }
}
