package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.InativarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.com.ecad.arrecadacao.domain.valueobjects.Cnpj;
import br.com.ecad.arrecadacao.domain.valueobjects.Contato;
import br.com.ecad.arrecadacao.domain.valueobjects.Endereco;
import br.org.ecad.audit.sdk.AuditClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class InativarUsuarioMusicaCommandHandlerTest {
    @Mock private UsuarioMusicaRepository repository;
    @Mock private HistoricoStatusUsuarioRepository historicoRepository;
    @Mock private AuditClient auditClient;
    @Mock private UsuarioMusicaAuditEventFactory auditEventFactory;
    @Mock private AuditContextProvider auditContextProvider;
    @InjectMocks private InativarUsuarioMusicaCommandHandler handler;

    @Test
    void deveInativar() {
        UUID id = UUID.randomUUID();
        var actor = new ActorSnapshot(
                "logto-user-1",
                "Maria Silva (maria.silva)",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev");
        UsuarioMusica entity = UsuarioMusica.criar("Old", "Old", Cnpj.criar("33683111000107"), Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"), Contato.criar("Resp", "123", "a@a.com"));
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(auditContextProvider.current(actor.label())).thenReturn(AuditContext.system(actor.label()));

        InativarUsuarioMusicaCommand cmd = new InativarUsuarioMusicaCommand(id, "justificativa-valida", actor);
        handler.handle(cmd);

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
    void deveFalharSeJaInativo() {
        UUID id = UUID.randomUUID();
        UsuarioMusica entity = UsuarioMusica.criar("Old", "Old", Cnpj.criar("33683111000107"), Endereco.criar("123", "Rua", "1", "", "Bairro", "Cidade", "UF"), Contato.criar("Resp", "123", "a@a.com"));
        entity.inativar("justificativa", "autor");
        when(repository.findById(id)).thenReturn(Optional.of(entity));

        InativarUsuarioMusicaCommand cmd = new InativarUsuarioMusicaCommand(id, "justificativa-v", "autor");
        assertThatThrownBy(() -> handler.handle(cmd))
                .isInstanceOf(IllegalStateException.class);
        verify(auditClient, never()).publish(any());
    }
}
