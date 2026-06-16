package br.com.ecad.arrecadacao.application.events;

import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.enums.StatusUsuarioMusica;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UsuarioMusicaIntegrationEventMapperTest {

    @Test
    void toPayload_DeveMapearTodosOsCamposDoSnapshot() {
        var usuario = UsuarioMusica.criar(
                "Rádio Globo SP Ltda",
                "Rádio Globo",
                Cnpj.criar("33683111000107"),
                Endereco.criar("12345-678", "Rua A", "100", "", "Centro", "São Paulo", "SP"),
                Contato.criar("João", "11999999999", "joao@radio.com"));

        Map<String, Object> payload = UsuarioMusicaIntegrationEventMapper.toPayload(usuario);

        assertThat(payload.get("id")).isEqualTo(usuario.getId().toString());
        assertThat(payload.get("razaoSocial")).isEqualTo("Rádio Globo SP Ltda");
        assertThat(payload.get("nomeFantasia")).isEqualTo("Rádio Globo");
        assertThat(payload.get("cnpj")).isEqualTo("33683111000107");
        assertThat(payload.get("cnpjFormatado")).isEqualTo("33.683.111/0001-07");
        assertThat(payload.get("status")).isEqualTo("ATIVO");
        assertThat(payload.get("criadoEm")).isEqualTo(usuario.getCriadoEm().toString());
        assertThat(payload.get("atualizadoEm")).isEqualTo(usuario.getAtualizadoEm().toString());
    }

    @Test
    void toPayload_DeveRefletirStatusInativo() {
        var usuario = UsuarioMusica.criar(
                "Rádio Inativa Ltda",
                "Rádio Inativa",
                Cnpj.criar("33683111000107"),
                Endereco.criar("12345-678", "Rua B", "200", "", "Bairro", "Rio", "RJ"),
                Contato.criar("Maria", "21988888888", "maria@radio.com"));
        usuario.inativar("justificativa longa suficiente", "admin");

        Map<String, Object> payload = UsuarioMusicaIntegrationEventMapper.toPayload(usuario);

        assertThat(payload.get("status")).isEqualTo("INATIVO");
        assertThat(payload.get("cnpjFormatado")).isEqualTo("33.683.111/0001-07");
    }

    @Test
    void toPayload_NaoDeveIncluirEnderecoEContato() {
        var usuario = UsuarioMusica.criar(
                "Teste",
                "Teste",
                Cnpj.criar("33683111000107"),
                Endereco.criar("12345-678", "Rua X", "1", "", "Bairro", "Cidade", "UF"),
                Contato.criar("Resp", "123", "a@a.com"));

        Map<String, Object> payload = UsuarioMusicaIntegrationEventMapper.toPayload(usuario);

        assertThat(payload).doesNotContainKeys("endereco", "contato", "cep", "logradouro", "telefone", "email");
    }
}
