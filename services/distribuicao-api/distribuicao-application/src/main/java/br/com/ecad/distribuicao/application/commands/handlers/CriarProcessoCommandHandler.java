package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.commands.CriarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.enums.StatusProcesso;
import br.com.ecad.distribuicao.domain.exceptions.ConflictException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotVerbaRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CriarProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CriarProcessoCommandHandler.class);
    private static final String EVENT_TYPE = "distribuicao.processo.iniciado";

    private final ProcessoRepository processoRepository;
    private final SnapshotRolRepository snapshotRolRepository;
    private final SnapshotVerbaRepository snapshotVerbaRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;

    public CriarProcessoCommandHandler(
            ProcessoRepository processoRepository,
            SnapshotRolRepository snapshotRolRepository,
            SnapshotVerbaRepository snapshotVerbaRepository,
            OutboxEventWriter outboxEventWriter,
            AuditClient auditClient,
            AuditContextProvider auditContextProvider,
            ProcessoAuditEventFactory auditEventFactory) {
        this.processoRepository = processoRepository;
        this.snapshotRolRepository = snapshotRolRepository;
        this.snapshotVerbaRepository = snapshotVerbaRepository;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditContextProvider = auditContextProvider;
        this.auditEventFactory = auditEventFactory;
    }

    @Transactional
    public ProcessoResponse handle(CriarProcessoCommand cmd) {
        // 1. Validar Rol fechado existe (não cancelado)
        var snapshotRol = snapshotRolRepository.findByRubricaSiglaAndPeriodo(cmd.rubricaSigla(), cmd.periodo())
                .orElseThrow(() -> new PreRequisitosException(
                        "Não existe Rol de Execuções fechado para rubrica '%s' e período '%s'"
                                .formatted(cmd.rubricaSigla(), cmd.periodo())));

        // 2. Validar Verba disponível
        var snapshotVerba = snapshotVerbaRepository.findByRubricaSiglaAndPeriodo(cmd.rubricaSigla(), cmd.periodo())
                .orElseThrow(() -> new PreRequisitosException(
                        "Não existe Verba disponível para rubrica '%s' e período '%s'"
                                .formatted(cmd.rubricaSigla(), cmd.periodo())));

        // 3. Validar unicidade (sem processo ativo)
        if (processoRepository.existsByRubricaSiglaAndPeriodoAndStatusNot(
                cmd.rubricaSigla(), cmd.periodo(), StatusProcesso.CANCELADO)) {
            throw new ConflictException(
                    "Já existe um processo de distribuição ativo para rubrica '%s' e período '%s'"
                            .formatted(cmd.rubricaSigla(), cmd.periodo()));
        }

        // 4. Criar processo
        var processo = ProcessoDistribuicao.criar(
                cmd.rubricaSigla(),
                cmd.periodo(),
                snapshotVerba.getVerbaLiquida(),
                cmd.analistaResponsavel(),
                snapshotRol.getId(),
                snapshotVerba.getId());
        processo = processoRepository.save(processo);

        // 5. Outbox de domínio
        outboxEventWriter.addEvent(EVENT_TYPE, processo.getId().toString(), buildPayload(processo));

        // 6. Auditoria (mesma transação)
        AuditContext auditCtx = auditContextProvider.current(cmd.analistaResponsavel());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.CREATE));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CREATE, null), auditCtx));

        LOGGER.info("distribuicao.processo.iniciado processoId={} rubricaSigla={} periodo={} analista={}",
                processo.getId(), processo.getRubricaSigla(), processo.getPeriodo(), cmd.analistaResponsavel());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayload(ProcessoDistribuicao processo) {
        return Map.of(
                "processoId", processo.getId().toString(),
                "rubricaSigla", processo.getRubricaSigla(),
                "periodo", processo.getPeriodo(),
                "status", processo.getStatus().name(),
                "analistaResponsavel", processo.getAnalistaResponsavel());
    }
}
