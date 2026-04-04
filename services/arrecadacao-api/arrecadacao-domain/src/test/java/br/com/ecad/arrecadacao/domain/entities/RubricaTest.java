package br.com.ecad.arrecadacao.domain.entities;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class RubricaTest {

    @Test
    void constructorShouldCreateInstanceWithAllFields() {
        UUID id = UUID.randomUUID();

        Rubrica rubrica = new Rubrica(id, "TV_ABERTA", "TV Aberta", true);

        assertThat(rubrica.getId()).isEqualTo(id);
        assertThat(rubrica.getSigla()).isEqualTo("TV_ABERTA");
        assertThat(rubrica.getNome()).isEqualTo("TV Aberta");
        assertThat(rubrica.isExigeClassificacao()).isTrue();
    }

    @Test
    void constructorShouldRejectNullSigla() {
        assertThatThrownBy(() -> new Rubrica(UUID.randomUUID(), null, "TV Aberta", true))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("sigla must not be null");
    }

    @Test
    void constructorShouldRejectNullNome() {
        assertThatThrownBy(() -> new Rubrica(UUID.randomUUID(), "TV_ABERTA", null, true))
                .isInstanceOf(NullPointerException.class)
                .hasMessage("nome must not be null");
    }
}
