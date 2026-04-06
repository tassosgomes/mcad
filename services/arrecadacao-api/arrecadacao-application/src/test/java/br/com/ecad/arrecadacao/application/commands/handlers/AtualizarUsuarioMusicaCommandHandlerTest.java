package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.AtualizarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtualizarUsuarioMusicaCommandHandlerTest {

    @Mock
    private UsuarioMusicaRepository repository;

    @InjectMocks
    private AtualizarUsuarioMusicaCommandHandler handler;

    @Test
    void deveAtualizarUsuarioComSucesso() {
        UUID id = UUID.randomUUID();
        UsuarioMusica entity = UsuarioMusica.criar("Old", "Old", Cnpj.criar("33683111000107"), Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"), Contato.criar("Resp", "123", "a@a.com"));
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(any())).thenReturn(entity);

        AtualizarUsuarioMusicaCommand command = new AtualizarUsuarioMusicaCommand(
                id, "New", "New",
                new EnderecoRequest("123", "Rua", "1", "", "Bairro", "Cidade", "UF"),
                new ContatoRequest("Resp", "123", "a@a.com"), "autor"
        );
        var resp = handler.handle(command);
        assertThat(resp.razaoSocial()).isEqualTo("New");
    }

    @Test
    void deveFalharSeUsuarioNaoExiste() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        AtualizarUsuarioMusicaCommand command = new AtualizarUsuarioMusicaCommand(
                id, "New", "New", null, null, "autor"
        );
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(EntidadeNaoEncontradaException.class);
    }
}
