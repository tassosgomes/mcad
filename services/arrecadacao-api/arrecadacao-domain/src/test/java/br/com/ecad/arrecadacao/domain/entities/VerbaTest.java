package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusVerba;
import br.com.ecad.arrecadacao.domain.exceptions.VerbaEmDistribuicaoException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class VerbaTest {

    private static final UUID RUBRICA_ID = UUID.randomUUID();
    private static final String PERIODO = "2026-04";

    // ── Factory abrir ─────────────────────────────────────────────────────────

    @Test
    void abrir_ComDadosValidos_DeveCriarVerbaComStatusAbertaEValoresZerados() {
        // Act
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);

        // Assert
        assertThat(verba.getId()).isNotNull();
        assertThat(verba.getRubricaId()).isEqualTo(RUBRICA_ID);
        assertThat(verba.getPeriodo()).isEqualTo(PERIODO);
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.ABERTA);
        assertThat(verba.getValorBrutoTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getDeducaoEcad()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getDeducaoAssociacoes()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getVerbaLiquida()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getQuantidadePagamentos()).isZero();
    }

    @Test
    void abrir_DevePreencherDatasDeAuditoria() {
        // Arrange
        Instant antes = Instant.now().minusSeconds(1);

        // Act
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);

        // Assert
        assertThat(verba.getCriadoEm()).isAfter(antes);
        assertThat(verba.getAtualizadoEm()).isAfter(antes);
    }

    @Test
    void abrir_ComRubricaIdNulo_DeveLancarNullPointerException() {
        assertThatThrownBy(() -> Verba.abrir(null, PERIODO))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("rubricaId");
    }

    @Test
    void abrir_ComPeriodoNulo_DeveLancarNullPointerException() {
        assertThatThrownBy(() -> Verba.abrir(RUBRICA_ID, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("periodo");
    }

    @Test
    void abrir_ComFormatoDePeriodoInvalido_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> Verba.abrir(RUBRICA_ID, "2026/04"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("YYYY-MM");
    }

    // ── Cálculo de deduções RF-05 ─────────────────────────────────────────────

    @Test
    void recalcular_ComBruto1000_DeveCalcularDeducoesCorretamente_RF05() {
        // Given — verba com bruto 1000 (RF-05: ecad 100, assoc 50, liquida 850)
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        BigDecimal bruto = new BigDecimal("1000.00");

        // When
        verba.recalcular(bruto, 1);

        // Then
        assertThat(verba.getValorBrutoTotal()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(verba.getDeducaoEcad()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(verba.getDeducaoAssociacoes()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(verba.getVerbaLiquida()).isEqualByComparingTo(new BigDecimal("850.00"));
        assertThat(verba.getQuantidadePagamentos()).isEqualTo(1);
    }

    @Test
    void recalcular_ComBruto1073_10_DeveCalcularDeducoesCorretamente_RF03() {
        // Given — 3 pagamentos: 5 UDAs, 3 UDAs, 2 UDAs = 10 UDAs × R$ 107,31 = R$ 1.073,10
        // RF-03: ecad = 107.31, assoc = 53.655 → 53.66, liquida = 1073.10 - 107.31 - 53.66 = 912.13
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        BigDecimal bruto = new BigDecimal("1073.10");

        // When
        verba.recalcular(bruto, 3);

        // Then
        assertThat(verba.getValorBrutoTotal()).isEqualByComparingTo(new BigDecimal("1073.10"));
        assertThat(verba.getDeducaoEcad()).isEqualByComparingTo(new BigDecimal("107.31"));
        // 1073.10 × 0.05 = 53.655 → HALF_UP → 53.66
        assertThat(verba.getDeducaoAssociacoes()).isEqualByComparingTo(new BigDecimal("53.66"));
        // 1073.10 - 107.31 - 53.66 = 912.13
        assertThat(verba.getVerbaLiquida()).isEqualByComparingTo(new BigDecimal("912.13"));
        assertThat(verba.getQuantidadePagamentos()).isEqualTo(3);
    }

    @Test
    void recalcular_QuandoStatusNaoEAberta_DeveLancarVerbaEmDistribuicaoException() {
        // Given — verba marcada como EM_DISTRIBUICAO
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();

        // When / Then
        assertThatThrownBy(() -> verba.recalcular(new BigDecimal("500.00"), 1))
                .isInstanceOf(VerbaEmDistribuicaoException.class)
                .hasMessageContaining("EM_DISTRIBUICAO");
    }

    @Test
    void recalcular_QuandoStatusEDistribuida_DeveLancarVerbaEmDistribuicaoException() {
        // Given — verba DISTRIBUIDA
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();
        verba.marcarDistribuida();

        // When / Then
        assertThatThrownBy(() -> verba.recalcular(new BigDecimal("500.00"), 1))
                .isInstanceOf(VerbaEmDistribuicaoException.class)
                .hasMessageContaining("DISTRIBUIDA");
    }

    // ── Estorno total RF-07 ───────────────────────────────────────────────────

    @Test
    void recalcular_ComBrutoZero_DeveManterRegistroComValoresZerados() {
        // Given — verba com pagamentos; após estorno total passa bruto=ZERO, qtd=0
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.recalcular(new BigDecimal("500.00"), 1);

        // When
        verba.recalcular(BigDecimal.ZERO, 0);

        // Then — registro permanece (RF-07), com valores zerados
        assertThat(verba.getValorBrutoTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getDeducaoEcad()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getDeducaoAssociacoes()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getVerbaLiquida()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(verba.getQuantidadePagamentos()).isZero();
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.ABERTA);
    }

    // ── Transições de status ──────────────────────────────────────────────────

    @Test
    void marcarEmDistribuicao_DeveTransicionarDeAbertaParaEmDistribuicao() {
        // Given
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);

        // When
        verba.marcarEmDistribuicao();

        // Then
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);
    }

    @Test
    void marcarDistribuida_DeveTransicionarDeEmDistribuicaoParaDistribuida() {
        // Given
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();

        // When
        verba.marcarDistribuida();

        // Then
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.DISTRIBUIDA);
    }

    @Test
    void marcarEmDistribuicao_QuandoJaEstaEmDistribuicao_DeveSerNoOp() {
        // Given — idempotência
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();
        Instant atualizadoDepoisDaPrimeira = verba.getAtualizadoEm();

        // When — segunda chamada
        verba.marcarEmDistribuicao();

        // Then — status não muda, sem exceção
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);
        // atualizadoEm pode ou não mudar (no-op), mas não lança exceção
    }

    @Test
    void marcarDistribuida_QuandoJaEstaDistribuida_DeveSerNoOp() {
        // Given — idempotência
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();
        verba.marcarDistribuida();

        // When — segunda chamada não lança exceção
        verba.marcarDistribuida();

        // Then
        assertThat(verba.getStatus()).isEqualTo(StatusVerba.DISTRIBUIDA);
    }

    @Test
    void marcarEmDistribuicao_QuandoJaEstaDistribuida_DeveLancarIllegalStateException() {
        // Given — transição inválida: DISTRIBUIDA → EM_DISTRIBUICAO
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);
        verba.marcarEmDistribuicao();
        verba.marcarDistribuida();

        // When / Then — tentativa de retroceder deve falhar (RF-12)
        assertThatThrownBy(verba::marcarEmDistribuicao)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DISTRIBUIDA");
    }

    @Test
    void marcarDistribuida_QuandoStatusEAberta_DeveLancarIllegalStateException() {
        // Given — transição inválida: ABERTA → DISTRIBUIDA (pula EM_DISTRIBUICAO)
        Verba verba = Verba.abrir(RUBRICA_ID, PERIODO);

        // When / Then
        assertThatThrownBy(verba::marcarDistribuida)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ABERTA");
    }
}
