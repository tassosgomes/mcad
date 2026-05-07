package br.com.ecad.distribuicao.tests.unit;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProcessoDistribuicaoTest {

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
}
