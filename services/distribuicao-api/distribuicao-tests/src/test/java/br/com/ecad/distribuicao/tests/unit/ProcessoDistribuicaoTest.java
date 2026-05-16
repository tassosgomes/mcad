package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.TransicaoInvalidaException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProcessoDistribuicaoTest {

    private static final UUID ROL_ID = UUID.randomUUID();
    private static final UUID VERBA_ID = UUID.randomUUID();

    // ===== CRIAÇÃO =====

    @Test
    void deveCriarProcessoComStatusCriado() {
        var processo = ProcessoDistribuicao.criar("RADIO", "2026-03", BigDecimal.valueOf(85000), "João", ROL_ID, VERBA_ID);
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CRIADO);
        assertThat(processo.getRubricaSigla()).isEqualTo("RADIO");
        assertThat(processo.getPeriodo()).isEqualTo("2026-03");
        assertThat(processo.getVerbaLiquida()).isEqualByComparingTo("85000");
        assertThat(processo.getAnalistaResponsavel()).isEqualTo("João");
        assertThat(processo.getCriadoEm()).isNotNull();
        assertThat(processo.getSnapshotRolId()).isEqualTo(ROL_ID);
        assertThat(processo.getSnapshotVerbaId()).isEqualTo(VERBA_ID);
    }

    // ===== TRANSIÇÕES VÁLIDAS =====

    @Test
    void deveTransicionarDeCriadoParaCalculado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(processo.getTotalExecucoes()).isEqualTo(100);
        assertThat(processo.getCalculadoEm()).isNotNull();
    }

    @Test
    void deveTransicionarDeCalculadoParaAprovado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        processo.aprovar();
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.APROVADO);
        assertThat(processo.getAprovadoEm()).isNotNull();
    }

    @Test
    void deveTransicionarDeAprovadoParaFinalizado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        processo.aprovar();
        processo.finalizar();
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.FINALIZADO);
        assertThat(processo.getFinalizadoEm()).isNotNull();
    }

    @Test
    void deveCancelarProcessoCriado() {
        var processo = criarProcesso();
        processo.cancelar("Motivo válido");
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CANCELADO);
        assertThat(processo.getJustificativaCancelamento()).isEqualTo("Motivo válido");
        assertThat(processo.getCanceladoEm()).isNotNull();
    }

    @Test
    void deveCancelarProcessoCalculado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        processo.cancelar("Cancelado após cálculo");
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CANCELADO);
    }

    @Test
    void deveCancelarProcessoAprovado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        processo.aprovar();
        processo.cancelar("Cancelado após aprovação");
        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CANCELADO);
    }

    // ===== TRANSIÇÕES INVÁLIDAS =====

    @Test
    void deveRejeitarTransicaoCriadoParaAprovado() {
        var processo = criarProcesso();
        assertThatThrownBy(processo::aprovar)
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void deveRejeitarTransicaoCriadoParaFinalizado() {
        var processo = criarProcesso();
        assertThatThrownBy(processo::finalizar)
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void deveRejeitarTransicaoCalculadoParaFinalizado() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        assertThatThrownBy(processo::finalizar)
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    @Test
    void deveRejeitarAprovacaoDeDuasVezes() {
        var processo = criarProcesso();
        processo.marcarCalculado(100);
        processo.aprovar();
        assertThatThrownBy(processo::aprovar)
                .isInstanceOf(TransicaoInvalidaException.class);
    }

    // ===== CANCELAMENTO FINAL =====

    @Test
    void deveRejeitarCancelamentoDeProcessoFinalizado() {
        var processo = criarProcessoFinalizado();
        assertThatThrownBy(() -> processo.cancelar("motivo"))
                .isInstanceOf(TransicaoInvalidaException.class)
                .hasMessageContaining("finalizado");
    }

    // ===== CAMPOS DE CÁLCULO =====

    @Test
    void marcarCalculado_WithSummaryFields_ShouldStoreAndReadValuesConsistently() {
        ProcessoDistribuicao processo = ProcessoDistribuicao.criar(
                "RADIO",
                "2026-05",
                new BigDecimal("1000.00"),
                "analista",
                UUID.randomUUID(),
                UUID.randomUUID());

        processo.marcarCalculado(
                25,
                2,
                new BigDecimal("40.000000"),
                3,
                new BigDecimal("1000.00"));

        assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CALCULADO);
        assertThat(processo.getTotalExecucoes()).isEqualTo(25);
        assertThat(processo.getTotalObras()).isEqualTo(2);
        assertThat(processo.getTotalPontos()).isEqualByComparingTo("40.000000");
        assertThat(processo.getTotalCreditos()).isEqualTo(3);
        assertThat(processo.getValorTotalCalculado()).isEqualByComparingTo("1000.00");
        assertThat(processo.getCalculadoEm()).isNotNull();
    }

    // ===== Helpers =====

    private ProcessoDistribuicao criarProcesso() {
        return ProcessoDistribuicao.criar("RADIO", "2026-03", BigDecimal.valueOf(85000), "João", ROL_ID, VERBA_ID);
    }

    private ProcessoDistribuicao criarProcessoFinalizado() {
        var p = criarProcesso();
        p.marcarCalculado(100);
        p.aprovar();
        p.finalizar();
        return p;
    }
}
