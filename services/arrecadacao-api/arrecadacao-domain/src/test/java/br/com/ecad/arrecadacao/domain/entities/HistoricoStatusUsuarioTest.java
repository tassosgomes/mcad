package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HistoricoStatusUsuarioTest {
    @Test
    void shouldRejectJustificativaTooShort() {
        assertThatThrownBy(() ->
            HistoricoStatusUsuario.criar(UUID.randomUUID(), StatusUsuarioMusica.ATIVO, StatusUsuarioMusica.INATIVO, "curta", "autor")
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
