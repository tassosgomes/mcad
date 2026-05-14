package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.AtualizarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtualizarUsuarioMusicaCommandHandlerTest {

    @Mock
    private UsuarioMusicaRepository repository;

    @Mock
    private AuditClient auditClient;

    @Mock
    private UsuarioMusicaAuditEventFactory auditEventFactory;

    @Mock
    private AuditContextProvider auditContextProvider;

    @InjectMocks
    private AtualizarUsuarioMusicaCommandHandler handler;

    @Test
    void deveFalharSeUsuarioNaoExiste() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        AtualizarUsuarioMusicaCommand command = new AtualizarUsuarioMusicaCommand(
                id, "New", "New", null, null, "autor"
        );
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(EntidadeNaoEncontradaException.class);
        verify(auditClient, never()).publish(any());
    }
}
