package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.commands.ReplicarUsuariosMusicaSnapshotCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.ReplicarSnapshotResponse;
import br.com.ecad.arrecadacao.application.events.UsuarioMusicaIntegrationEventMapper;
import br.com.ecad.arrecadacao.domain.entities.UsuarioMusica;
import br.com.ecad.arrecadacao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.arrecadacao.domain.interfaces.UsuarioMusicaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ReplicarUsuariosMusicaSnapshotCommandHandler
        implements CommandHandler<ReplicarUsuariosMusicaSnapshotCommand, ReplicarSnapshotResponse> {

    private static final Logger LOGGER = LoggerFactory.getLogger(ReplicarUsuariosMusicaSnapshotCommandHandler.class);

    private static final String EVENT_TYPE = "arrecadacao.usuario-musica.atualizado";

    private final UsuarioMusicaRepository repository;
    private final OutboxEventWriter outboxEventWriter;

    public ReplicarUsuariosMusicaSnapshotCommandHandler(UsuarioMusicaRepository repository,
                                                        OutboxEventWriter outboxEventWriter) {
        this.repository = repository;
        this.outboxEventWriter = outboxEventWriter;
    }

    @Override
    @Transactional
    public ReplicarSnapshotResponse handle(ReplicarUsuariosMusicaSnapshotCommand cmd) {
        var usuarios = repository.findAll();
        int count = 0;
        for (UsuarioMusica u : usuarios) {
            outboxEventWriter.addEvent(
                    EVENT_TYPE,
                    u.getId().toString(),
                    UsuarioMusicaIntegrationEventMapper.toPayload(u));
            count++;
        }
        LOGGER.info("Snapshot replication completed. eventosPublicados={}", count);
        return new ReplicarSnapshotResponse(count);
    }
}
