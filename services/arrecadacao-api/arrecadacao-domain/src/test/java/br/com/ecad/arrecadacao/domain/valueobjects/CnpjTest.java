package br.com.ecad.arrecadacao.domain.valueobjects;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CnpjTest {
    @Test
    void shouldAcceptValidNumericCnpj() {
        Cnpj cnpj = Cnpj.criar("33683111000107");
        assertThat(cnpj.getValor()).isEqualTo("33683111000107");
        assertThat(cnpj.getFormatado()).isEqualTo("33.683.111/0001-07");
    }

    @Test
    void shouldAcceptValidAlphanumericCnpj() {
        String base = "AABBCCDDEEFF";
        int sum1 = 0;
        int[] w1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        for (int i = 0; i < 12; i++) {
            sum1 += (base.charAt(i) - 48) * w1[i];
        }
        int r1 = sum1 % 11;
        int dv1 = r1 < 2 ? 0 : 11 - r1;

        int sum2 = 0;
        int[] w2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        for (int i = 0; i < 12; i++) {
            sum2 += (base.charAt(i) - 48) * w2[i];
        }
        sum2 += dv1 * 2;
        int r2 = sum2 % 11;
        int dv2 = r2 < 2 ? 0 : 11 - r2;

        String generatedCnpj = base + dv1 + dv2;
        Cnpj cnpj = Cnpj.criar(generatedCnpj);
        assertThat(cnpj.getValor()).isEqualTo(generatedCnpj);
    }

    @Test
    void shouldRejectInvalidCnpj() {
        assertThatThrownBy(() -> Cnpj.criar("11111111111111"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
