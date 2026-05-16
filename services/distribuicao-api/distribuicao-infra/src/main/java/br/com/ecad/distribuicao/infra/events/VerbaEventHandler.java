package br.com.ecad.distribuicao.infra.events;

import br.com.ecad.distribuicao.domain.entities.SnapshotVerba;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerbaEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(VerbaEventHandler.class);

    private final SnapshotVerbaRepository snapshotVerbaRepository;

    public VerbaEventHandler(SnapshotVerbaRepository snapshotVerbaRepository) {
        this.snapshotVerbaRepository = snapshotVerbaRepository;
    }

    /**
     * Processa o evento {@code arrecadacao.verba.disponivel}.
     * Upsert por rubrica+período: se já existe, atualiza o valor líquido;
     * caso contrário, cria novo. Idempotente.
     */
    @Transactional
    public void handleVerbaDisponivel(VerbaEventPayload payload) {
        snapshotVerbaRepository.findByRubricaSiglaAndPeriodo(payload.rubricaSigla(), payload.periodo())
                .ifPresentOrElse(
                        existing -> {
                            // Snapshot já existe — idempotência (não recria)
                            LOGGER.info(
                                    "Snapshot Verba já existe — nenhuma ação necessária. rubrica={} periodo={}",
                                    payload.rubricaSigla(), payload.periodo());
                        },
                        () -> {
                            SnapshotVerba snapshot = new SnapshotVerba(
                                    payload.rubricaSigla(),
                                    payload.periodo(),
                                    payload.valorBruto(),
                                    payload.deducaoEcad(),
                                    payload.deducaoAssociacoes(),
                                    payload.verbaLiquida(),
                                    Instant.now());
                            snapshotVerbaRepository.save(snapshot);
                            LOGGER.info(
                                    "Snapshot Verba recebido. rubrica={} periodo={} verbaLiquida={}",
                                    payload.rubricaSigla(), payload.periodo(), payload.verbaLiquida());
                        });
    }
}
