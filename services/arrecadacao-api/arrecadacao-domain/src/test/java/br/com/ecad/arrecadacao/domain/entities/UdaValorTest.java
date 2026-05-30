package br.com.ecad.arrecadacao.domain.entities;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

class UdaValorTest {

    @Test
    void criar_ComValorValidoEDataVigencia_DeveRetornarUdaValor() {
        // Arrange
        BigDecimal valor = new BigDecimal("107.310000");
        LocalDate dataVigencia = LocalDate.of(2026, 1, 1);

        // Act
        UdaValor uda = UdaValor.criar(valor, dataVigencia, "analista.arrecadacao");

        // Assert
        assertThat(uda).isNotNull();
        assertThat(uda.getId()).isNotNull();
        assertThat(uda.getValor()).isEqualByComparingTo(valor);
        assertThat(uda.getDataVigencia()).isEqualTo(dataVigencia);
        assertThat(uda.getCriadoPor()).isEqualTo("analista.arrecadacao");
        assertThat(uda.getCriadoPorSubject()).isNull();
        assertThat(uda.getCriadoPorRotulo()).isNull();
        assertThat(uda.getCriadoEm()).isNotNull();
    }

    @Test
    void criar_ComCriadoPorNulo_DevePermitir_ParaSeed() {
        // Arrange & Act
        UdaValor uda = UdaValor.criar(new BigDecimal("107.31"), LocalDate.of(2026, 1, 1), null);

        // Assert
        assertThat(uda.getCriadoPor()).isNull();
    }

    @Test
    void criar_ComValorZero_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> UdaValor.criar(BigDecimal.ZERO, LocalDate.now(), "author"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void criar_ComValorNegativo_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> UdaValor.criar(new BigDecimal("-1.00"), LocalDate.now(), "author"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void criar_ComValorNulo_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> UdaValor.criar(null, LocalDate.now(), "author"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que zero");
    }

    @Test
    void criar_ComDataVigenciaNula_DeveLancarIllegalArgumentException() {
        assertThatThrownBy(() -> UdaValor.criar(new BigDecimal("107.31"), null, "author"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nao pode ser nula");
    }

    @Test
    void criar_ComSnapshotAtor_DevePersistirSubjectRotuloELegado() {
        UdaValor uda = UdaValor.criar(
                new BigDecimal("107.31"),
                LocalDate.of(2026, 1, 1),
                "logto-user-3",
                "Ana Lima (ana.lima)");

        assertThat(uda.getCriadoPorSubject()).isEqualTo("logto-user-3");
        assertThat(uda.getCriadoPorRotulo()).isEqualTo("Ana Lima (ana.lima)");
        assertThat(uda.getCriadoPor()).isEqualTo("Ana Lima (ana.lima)");
    }

    @Test
    void criar_ComSnapshotAtorERotuloEmBranco_DeveLancar() {
        assertThatThrownBy(() -> UdaValor.criar(
                new BigDecimal("107.31"),
                LocalDate.of(2026, 1, 1),
                "logto-user-3",
                " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("criadoPorRotulo must not be blank");
    }
}
