package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HistoricoStatusUsuarioTest {

    private static final UUID USUARIO_MUSICA_ID = UUID.randomUUID();
    private static final String JUSTIFICATIVA = "Atualizacao cadastral completa";

    @Test
    void criar_ComAutorLegado_DeveManterSnapshotNulo() {
        HistoricoStatusUsuario historico = HistoricoStatusUsuario.criar(
                USUARIO_MUSICA_ID,
                StatusUsuarioMusica.ATIVO,
                StatusUsuarioMusica.INATIVO,
                JUSTIFICATIVA,
                "analista");

        assertThat(historico.getAutor()).isEqualTo("analista");
        assertThat(historico.getAtorSubject()).isNull();
        assertThat(historico.getAutorRotulo()).isNull();
    }

    @Test
    void criar_ComSnapshotAtor_DevePersistirSubjectRotuloELegado() {
        HistoricoStatusUsuario historico = HistoricoStatusUsuario.criar(
                USUARIO_MUSICA_ID,
                StatusUsuarioMusica.ATIVO,
                StatusUsuarioMusica.INATIVO,
                JUSTIFICATIVA,
                "logto-user-2",
                "Joao Souza (joao.souza)");

        assertThat(historico.getAtorSubject()).isEqualTo("logto-user-2");
        assertThat(historico.getAutorRotulo()).isEqualTo("Joao Souza (joao.souza)");
        assertThat(historico.getAutor()).isEqualTo("Joao Souza (joao.souza)");
    }

    @Test
    void criar_ComSnapshotAtorESubjectEmBranco_DeveLancar() {
        assertThatThrownBy(() -> HistoricoStatusUsuario.criar(
                USUARIO_MUSICA_ID,
                StatusUsuarioMusica.ATIVO,
                StatusUsuarioMusica.INATIVO,
                JUSTIFICATIVA,
                " ",
                "Joao Souza (joao.souza)"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("atorSubject must not be blank");
    }
}
