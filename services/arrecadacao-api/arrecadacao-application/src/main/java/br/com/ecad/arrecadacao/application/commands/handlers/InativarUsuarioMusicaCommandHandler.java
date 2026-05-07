package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditChange;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory;
import br.com.ecad.arrecadacao.application.audit.UsuarioMusicaAuditEventFactory.UsuarioMusicaAuditOperation;
import br.com.ecad.arrecadacao.application.commands.InativarUsuarioMusicaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.domain.entities.HistoricoStatusUsuario;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.exceptions.EntidadeNaoEncontradaException;
import br.com.ecad.arrecadacao.domain.interfaces.HistoricoStatusUsuarioRepository;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
public class InativarUsuarioMusicaCommandHandler implements CommandHandler<InativarUsuarioMusicaCommand, Void> {

    private final UsuarioMusicaRepository repository;
    private final HistoricoStatusUsuarioRepository historicoRepository;
    private final AuditClient auditClient;
    private final UsuarioMusicaAuditEventFactory auditEventFactory;
    private final AuditContextProvider auditContextProvider;

    public InativarUsuarioMusicaCommandHandler(UsuarioMusicaRepository repository,
                                               HistoricoStatusUsuarioRepository historicoRepository,
                                               AuditClient auditClient,
                                               UsuarioMusicaAuditEventFactory auditEventFactory,
                                               AuditContextProvider auditContextProvider) {
        this.repository = repository;
        this.historicoRepository = historicoRepository;
        this.auditClient = auditClient;
        this.auditEventFactory = auditEventFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public Void handle(InativarUsuarioMusicaCommand cmd) {
        UsuarioMusica entity = repository.findById(cmd.id())
                .orElseThrow(() -> new EntidadeNaoEncontradaException("Usuário de música não encontrado"));
        Map<String, Object> before = auditEventFactory.usuarioMap(entity);

        HistoricoStatusUsuario historico = entity.inativar(cmd.justificativa(), cmd.autor());
        repository.save(entity);
        historicoRepository.save(historico);

        var auditContext = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(entity, auditContext, UsuarioMusicaAuditOperation.INACTIVATE));
        auditClient.publish(auditEventFactory.dataChange(
                new UsuarioMusicaAuditChange(entity, UsuarioMusicaAuditOperation.INACTIVATE, before), auditContext));

        return null;
    }
}
