package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.ReplicarUsuariosMusicaSnapshotCommand;
import br.com.ecad.arrecadacao.application.dto.ReplicarSnapshotResponse;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReplicarUsuariosMusicaSnapshotCommandHandlerTest {

    @Mock
    private UsuarioMusicaRepository repository;

    @Mock
    private OutboxEventWriter outboxEventWriter;

    @InjectMocks
    private ReplicarUsuariosMusicaSnapshotCommandHandler handler;

    private static final Endereco DEFAULT_ENDERECO = Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF");
    private static final Contato DEFAULT_CONTATO = Contato.criar("Resp", "123", "a@a.com");

    @Test
    void handle_WhenNoUsersExist_ShouldReturnZeroEvents() {
        when(repository.findAll()).thenReturn(List.of());

        ReplicarSnapshotResponse response = handler.handle(new ReplicarUsuariosMusicaSnapshotCommand());

        assertThat(response.eventosPublicados()).isZero();
        verify(outboxEventWriter, times(0)).addEvent(anyString(), anyString(), anyMap());
    }

    @Test
    void handle_WithMultipleUsers_ShouldPublishOneEventPerUser() {
        UsuarioMusica u1 = criarUsuario("Radio A", "50997063000132");
        UsuarioMusica u2 = criarUsuario("Radio B", "11222333000181");
        when(repository.findAll()).thenReturn(List.of(u1, u2));

        ReplicarSnapshotResponse response = handler.handle(new ReplicarUsuariosMusicaSnapshotCommand());

        assertThat(response.eventosPublicados()).isEqualTo(2);
        verify(outboxEventWriter, times(2)).addEvent(
                eq("arrecadacao.usuario-musica.atualizado"), anyString(), anyMap());
    }

    @Test
    void handle_WithSingleUser_ShouldPublishExactlyOneEvent() {
        UsuarioMusica u1 = criarUsuario("Radio C", "33683111000107");
        when(repository.findAll()).thenReturn(List.of(u1));

        ReplicarSnapshotResponse response = handler.handle(new ReplicarUsuariosMusicaSnapshotCommand());

        assertThat(response.eventosPublicados()).isEqualTo(1);
        verify(outboxEventWriter, times(1)).addEvent(
                eq("arrecadacao.usuario-musica.atualizado"), anyString(), anyMap());
    }

    private static UsuarioMusica criarUsuario(String razaoSocial, String cnpj) {
        return UsuarioMusica.criar(razaoSocial, "Fantasia " + razaoSocial,
                Cnpj.criar(cnpj), DEFAULT_ENDERECO, DEFAULT_CONTATO);
    }
}
