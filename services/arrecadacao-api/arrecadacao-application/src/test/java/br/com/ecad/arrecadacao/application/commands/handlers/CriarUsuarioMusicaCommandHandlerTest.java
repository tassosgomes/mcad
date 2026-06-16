package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContext;
import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.actor.ActorSnapshot;
import br.com.ecad.arrecadacao.application.commands.CriarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.dto.ContatoRequest;
import br.com.ecad.arrecadacao.application.dto.EnderecoRequest;
import br.com.ecad.arrecadacao.application.dto.UsuarioMusicaResponse;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.exceptions.CnpjDuplicadoException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CriarUsuarioMusicaCommandHandlerTest {

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

    @Mock
    private OutboxEventWriter outboxEventWriter;

    @InjectMocks
    private CriarUsuarioMusicaCommandHandler handler;

    @Test
    void deveCriarUsuarioComSucesso() {
        var actor = new ActorSnapshot(
                "logto-user-1",
                "Maria Silva (maria.silva)",
                "maria.silva",
                "Maria Silva",
                "maria@mcad.dev");
        CriarUsuarioMusicaCommand command = new CriarUsuarioMusicaCommand(
                "Teste", "Fantasia", "33683111000107",
                new EnderecoRequest("123", "Rua", "1", "", "Bairro", "Cidade", "UF"),
                new ContatoRequest("Resp", "123", "a@a.com"), actor
        );
        when(repository.existsByCnpj(any())).thenReturn(false);
        when(repository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        when(auditContextProvider.current(actor.label())).thenReturn(AuditContext.system(actor.label()));

        UsuarioMusicaResponse resp = handler.handle(command);
        assertThat(resp.status()).isEqualTo("ATIVO");
        verify(repository).save(any());
        var historicoCaptor = ArgumentCaptor.forClass(HistoricoStatusUsuario.class);
        verify(historicoRepository).save(historicoCaptor.capture());
        var historico = historicoCaptor.getValue();
        assertThat(historico.getAtorSubject()).isEqualTo(actor.subject());
        assertThat(historico.getAutorRotulo()).isEqualTo(actor.label());
        assertThat(historico.getAutor()).isEqualTo(actor.label());
        verify(auditClient, times(2)).publish(any());
        verify(outboxEventWriter).addEvent(eq("arrecadacao.usuario-musica.criado"), anyString(), anyMap());
    }

    @Test
    void deveRejeitarCnpjDuplicado() {
        CriarUsuarioMusicaCommand command = new CriarUsuarioMusicaCommand(
                "Teste", "Fantasia", "33683111000107", null, null, "autor"
        );
        when(repository.existsByCnpj(any())).thenReturn(true);

        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(CnpjDuplicadoException.class);
        verify(auditClient, never()).publish(any());
        verify(outboxEventWriter, never()).addEvent(anyString(), anyString(), anyMap());
    }
}
