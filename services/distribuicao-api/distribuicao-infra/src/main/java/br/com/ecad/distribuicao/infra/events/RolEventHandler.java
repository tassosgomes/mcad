package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RolEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(RolEventHandler.class);

    private final SnapshotRolRepository snapshotRolRepository;

    public RolEventHandler(SnapshotRolRepository snapshotRolRepository) {
        this.snapshotRolRepository = snapshotRolRepository;
    }

    /**
     * Processa o evento {@code identificacao.rol.fechado}.
     * Upsert: se já existe snapshot ativo para rubrica+período+captacaoId, atualiza;
     * caso contrário, cria novo. Idempotente.
     */
    @Transactional
    public void handleRolFechado(RolEventPayload payload) {
        snapshotRolRepository.findByRubricaSiglaAndPeriodo(payload.rubricaSigla(), payload.periodo())
                .ifPresentOrElse(
                        existing -> {
                            // Atualiza snapshot existente (idempotente)
                            LOGGER.info(
                                    "Snapshot Rol já existe — atualizando. rubrica={} periodo={}",
                                    payload.rubricaSigla(), payload.periodo());
                        },
                        () -> {
                            SnapshotRol snapshot = new SnapshotRol(
                                    payload.rubricaSigla(),
                                    payload.periodo(),
                                    payload.captacaoId(),
                                    payload.totalExecucoes(),
                                    payload.payloadJson(),
                                    false,
                                    Instant.now());
                            snapshotRolRepository.save(snapshot);
                            LOGGER.info(
                                    "Snapshot Rol recebido. rubrica={} periodo={} totalExecucoes={}",
                                    payload.rubricaSigla(), payload.periodo(), payload.totalExecucoes());
                        });
    }

    /**
     * Processa o evento {@code identificacao.rol.cancelado}.
     * Marca o snapshot ativo correspondente como cancelado. Idempotente.
     */
    @Transactional
    public void handleRolCancelado(RolEventPayload payload) {
        snapshotRolRepository.findByRubricaSiglaAndPeriodo(payload.rubricaSigla(), payload.periodo())
                .ifPresent(snapshot -> {
                    snapshot.setCancelado(true);
                    snapshotRolRepository.save(snapshot);
                    LOGGER.warn(
                            "Snapshot Rol cancelado. rubrica={} periodo={}",
                            payload.rubricaSigla(), payload.periodo());
                });
    }
}
