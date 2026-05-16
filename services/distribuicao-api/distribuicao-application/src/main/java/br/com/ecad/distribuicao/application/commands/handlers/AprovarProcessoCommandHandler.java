package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.com.ecad.distribuicao.application.commands.AprovarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AprovarProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(AprovarProcessoCommandHandler.class);
    private static final String EVENT_TYPE = "distribuicao.processo.aprovado";

    private final ProcessoRepository processoRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;

    public AprovarProcessoCommandHandler(
            ProcessoRepository processoRepository,
            OutboxEventWriter outboxEventWriter,
            AuditClient auditClient,
            AuditContextProvider auditContextProvider,
            ProcessoAuditEventFactory auditEventFactory) {
        this.processoRepository = processoRepository;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditContextProvider = auditContextProvider;
        this.auditEventFactory = auditEventFactory;
    }

    @Transactional
    public ProcessoResponse handle(AprovarProcessoCommand cmd) {
        ProcessoDistribuicao processo = processoRepository.findById(cmd.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + cmd.processoId()));

        // Capturar before ANTES de mutar
        ProcessoSnapshot antes = ProcessoSnapshot.from(processo);

        processo.aprovar();
        processo = processoRepository.save(processo);

        outboxEventWriter.addEvent(EVENT_TYPE, processo.getId().toString(), buildPayload(processo));

        AuditContext auditCtx = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.APPROVE));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.APPROVE, antes), auditCtx));

        LOGGER.info("distribuicao.processo.aprovado processoId={} rubricaSigla={} periodo={}",
                processo.getId(), processo.getRubricaSigla(), processo.getPeriodo());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayload(ProcessoDistribuicao processo) {
        return Map.of(
                "processoId", processo.getId().toString(),
                "rubricaSigla", processo.getRubricaSigla(),
                "periodo", processo.getPeriodo(),
                "status", processo.getStatus().name());
    }
}
