package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class PagamentoTest {

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final BigDecimal QUANTIDADE_UDAS = new BigDecimal("2.5");
    private static final BigDecimal VALOR_UDA = new BigDecimal("107.31");
    private static final String JUSTIFICATIVA_VALIDA = "Pagamento registrado em duplicidade com erro de valor.";
    private static final String AUTOR_VALIDO = "analista@ecad.org.br";

    @Test
    void registrar_ComDadosValidos_DeveCalcularValorBrutoCorretamente() {
        // Arrange & Act
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Assert
        assertThat(pagamento).isNotNull();
        assertThat(pagamento.getId()).isNotNull();
        assertThat(pagamento.getLicencaId()).isEqualTo(LICENCA_ID);
        // 2.5 × 107.31 = 268.275000
        assertThat(pagamento.getValorBruto()).isEqualByComparingTo(new BigDecimal("268.275000"));
        assertThat(pagamento.getQuantidadeUdas()).isEqualByComparingTo(QUANTIDADE_UDAS);
    }

    @Test
    void registrar_DeveUsarSnapshotImutavelDoValorUda() {
        // Act
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Assert — snapshot gravado no momento do registro
        assertThat(pagamento.getValorUdaNoMomento()).isEqualByComparingTo(VALOR_UDA);
    }

    @Test
    void registrar_DevePreencherPeriodoComMesCorrente() {
        // Act
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Assert
        String periodoEsperado = YearMonth.now().toString();
        assertThat(pagamento.getPeriodo()).isEqualTo(periodoEsperado);
    }

    @Test
    void registrar_StatusInicial_DeveSerCONFIRMADO() {
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CONFIRMADO);
    }

    @Test
    void registrar_DevePreencherDataRegistroETimestamps() {
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);
        assertThat(pagamento.getDataRegistro()).isNotNull();
        assertThat(pagamento.getCriadoEm()).isNotNull();
        assertThat(pagamento.getAtualizadoEm()).isNotNull();
    }

    @Test
    void registrar_ComQuantidadeUdasZero_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> Pagamento.registrar(LICENCA_ID, BigDecimal.ZERO, VALOR_UDA))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void registrar_ComQuantidadeUdasNegativa_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> Pagamento.registrar(LICENCA_ID, new BigDecimal("-1"), VALOR_UDA))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void registrar_ComQuantidadeUdasNula_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> Pagamento.registrar(LICENCA_ID, null, VALOR_UDA))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void registrar_ComFracaDecimal_DeveCalcularCorretamente() {
        // Arrange — 0.75 × 107.31 = 80.482500
        BigDecimal quantidade = new BigDecimal("0.75");

        // Act
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, quantidade, VALOR_UDA);

        // Assert
        assertThat(pagamento.getValorBruto()).isEqualByComparingTo(new BigDecimal("80.482500"));
    }

    // ── Testes de Estorno (F06) ────────────────────────────────────────────────

    @Test
    void estornar_WithConfirmado_ShouldSetEstornadoAndFillAllFields() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act
        pagamento.estornar(JUSTIFICATIVA_VALIDA, AUTOR_VALIDO);

        // Assert
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        assertThat(pagamento.getJustificativaEstorno()).isEqualTo(JUSTIFICATIVA_VALIDA);
        assertThat(pagamento.getEstornadoPor()).isEqualTo(AUTOR_VALIDO);
        assertThat(pagamento.getEstornadoEm()).isNotNull();
        assertThat(pagamento.getAtualizadoEm()).isNotNull();
    }

    @Test
    void estornar_WithEstornado_ShouldThrowIllegalState() {
        // Arrange — já estornado
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);
        pagamento.estornar(JUSTIFICATIVA_VALIDA, AUTOR_VALIDO);

        // Act & Assert — estorno de pagamento já estornado deve falhar
        assertThatThrownBy(() -> pagamento.estornar(JUSTIFICATIVA_VALIDA, AUTOR_VALIDO))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CONFIRMADOS");
    }

    @Test
    void estornar_WithShortJustificativa_ShouldThrowIllegalArgument() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act & Assert — justificativa < 10 chars
        assertThatThrownBy(() -> pagamento.estornar("curta", AUTOR_VALIDO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 10 and 500");
    }

    @Test
    void estornar_WithLongJustificativa_ShouldThrowIllegalArgument() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);
        String justificativaMuitoLonga = "x".repeat(501);

        // Act & Assert — justificativa > 500 chars
        assertThatThrownBy(() -> pagamento.estornar(justificativaMuitoLonga, AUTOR_VALIDO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 10 and 500");
    }

    @Test
    void estornar_WithNullJustificativa_ShouldThrowIllegalArgument() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act & Assert
        assertThatThrownBy(() -> pagamento.estornar(null, AUTOR_VALIDO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 10 and 500");
    }

    @Test
    void estornar_WithBlankAutor_ShouldThrowIllegalArgument() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act & Assert
        assertThatThrownBy(() -> pagamento.estornar(JUSTIFICATIVA_VALIDA, "   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Autor must not be blank");
    }

    @Test
    @Disabled("Production code lacks explicit null guard on licencaId in Pagamento.registrar() — "
            + "the factory only validates quantidadeUdas/valorUdaVigente and assigns licencaId directly. "
            + "A null licencaId only fails later at JPA persist (nullable=false). "
            + "Decision needed: add Objects.requireNonNull(licencaId, ...) at the factory or accept lazy failure.")
    void registrar_NullLicencaId_DeveLancar() {
        // Intentionally left disabled — see @Disabled message above.
    }

    @Test
    void estornar_NullAutor_DeveLancar() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act & Assert — autor null deve cair na mesma guarda do autor blank
        assertThatThrownBy(() -> pagamento.estornar(JUSTIFICATIVA_VALIDA, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Autor must not be blank");
    }
}
