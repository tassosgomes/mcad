package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusPagamento;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class PagamentoTest {

    private static final UUID LICENCA_ID = UUID.randomUUID();
    private static final BigDecimal QUANTIDADE_UDAS = new BigDecimal("2.5");
    private static final BigDecimal VALOR_UDA = new BigDecimal("107.31");

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

    @Test
    void estornar_DeConfirmado_DeveAlterarStatusParaEstornado() {
        // Arrange
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);

        // Act
        pagamento.estornar();

        // Assert
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        assertThat(pagamento.getAtualizadoEm()).isNotNull();
    }

    @Test
    void estornar_DeEstornado_DeveLancarIllegalStateException() {
        // Arrange — já estornado
        Pagamento pagamento = Pagamento.registrar(LICENCA_ID, QUANTIDADE_UDAS, VALOR_UDA);
        pagamento.estornar();

        // Act & Assert — estorno de pagamento já estornado deve falhar
        assertThatThrownBy(pagamento::estornar)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CONFIRMADOS");
    }
}
