package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.AtivarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.org.ecad.audit.sdk.AuditClient;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AtivarUsuarioMusicaCommandHandlerTest {

    @Mock
    private UsuarioMusicaRepository repository;

    @Mock
    private HistoricoStatusUsuarioRepository historicoRepository;

    @Mock
    private AuditClient auditClient;

    @Mock
    private UsuarioMusicaAuditEventFactory auditEventFactory;

    @Mock
    private AuditContextProvider auditContextProvider;

    @InjectMocks
    private AtivarUsuarioMusicaCommandHandler handler;

    @Test
    void deveAtivarComSnapshotDoAtor() {
        UUID id = UUID.randomUUID();
        var actor = new ActorSnapshot(
                "logto-user-1",
                "Maria Silva (maria.silva)",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev");
        UsuarioMusica entity = usuarioInativo();
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(auditContextProvider.current(actor.label())).thenReturn(AuditContext.system(actor.label()));

        var command = new AtivarUsuarioMusicaCommand(id, "justificativa-valida", actor);
        handler.handle(command);

        verify(repository).save(entity);
        var historicoCaptor = ArgumentCaptor.forClass(HistoricoStatusUsuario.class);
        verify(historicoRepository).save(historicoCaptor.capture());
        var historico = historicoCaptor.getValue();
        assertThat(historico.getAtorSubject()).isEqualTo(actor.subject());
        assertThat(historico.getAutorRotulo()).isEqualTo(actor.label());
        assertThat(historico.getAutor()).isEqualTo(actor.label());
        verify(auditClient, times(2)).publish(any());
    }

    @Test
    void deveFalharSeJaAtivo() {
        UUID id = UUID.randomUUID();
        UsuarioMusica entity = usuarioAtivo();
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        var command = new AtivarUsuarioMusicaCommand(id, "justificativa-valida", "autor");

        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(IllegalStateException.class);
        verify(auditClient, never()).publish(any());
    }

    private UsuarioMusica usuarioInativo() {
        UsuarioMusica entity = usuarioAtivo();
        entity.inativar("justificativa valida", "autor");
        return entity;
    }

    private UsuarioMusica usuarioAtivo() {
        return UsuarioMusica.criar(
                "Old",
                "Old",
                Cnpj.criar("33683111000107"),
                Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"),
                Contato.criar("Resp", "123", "a@a.com"));
    }
}
