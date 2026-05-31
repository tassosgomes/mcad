package br.com.ecad.arrecadacao.domain.entities;

import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UsuarioMusicaTest {
    private Cnpj criarCnpj() {
        return Cnpj.criar("33683111000107");
    }
    private Endereco criarEndereco() {
        return Endereco.criar("12345678", "Rua A", "123", null, "Bairro", "Cidade", "UF");
    }
    private Contato criarContato() {
        return Contato.criar("Responsavel", "123456", "email@test.com");
    }

    @Test
    void shouldInativar() {
        UsuarioMusica u = UsuarioMusica.criar("Empresa X", "Fantasia X", criarCnpj(), criarEndereco(), criarContato());
        HistoricoStatusUsuario historico = u.inativar("justificativa valida", "logto-user-1", "Maria Silva");
        assertThat(u.getStatus()).isEqualTo(StatusUsuarioMusica.INATIVO);
        assertThat(historico.getAtorSubject()).isEqualTo("logto-user-1");
        assertThat(historico.getAutorRotulo()).isEqualTo("Maria Silva");
        assertThat(historico.getAutor()).isEqualTo("Maria Silva");
    }

    @Test
    void shouldAtivar() {
        UsuarioMusica u = UsuarioMusica.criar("Empresa X", "Fantasia X", criarCnpj(), criarEndereco(), criarContato());
        u.inativar("justificativa valida", "autor");
        HistoricoStatusUsuario historico = u.ativar("justificativa valida", "logto-user-2", "Joao Souza");
        assertThat(u.getStatus()).isEqualTo(StatusUsuarioMusica.ATIVO);
        assertThat(historico.getAtorSubject()).isEqualTo("logto-user-2");
        assertThat(historico.getAutorRotulo()).isEqualTo("Joao Souza");
        assertThat(historico.getAutor()).isEqualTo("Joao Souza");
    }

    @Test
    void shouldNotInativarIfAlreadyInativo() {
        UsuarioMusica u = UsuarioMusica.criar("Empresa X", "Fantasia X", criarCnpj(), criarEndereco(), criarContato());
        u.inativar("justificativa valida", "autor");
        assertThatThrownBy(() -> u.inativar("justificativa valida", "autor"))
            .isInstanceOf(IllegalStateException.class);
    }
}
