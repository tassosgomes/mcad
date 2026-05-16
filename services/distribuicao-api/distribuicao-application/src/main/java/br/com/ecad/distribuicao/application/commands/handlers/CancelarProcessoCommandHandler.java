package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.com.ecad.distribuicao.application.commands.CancelarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CancelarProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CancelarProcessoCommandHandler.class);
    private static final String EVENT_TYPE = "distribuicao.processo.cancelado";
    private static final int JUSTIFICATIVA_MIN_LENGTH = 10;

    private final ProcessoRepository processoRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;

    public CancelarProcessoCommandHandler(
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
    public ProcessoResponse handle(CancelarProcessoCommand cmd) {
        if (cmd.justificativa() == null || cmd.justificativa().trim().length() < JUSTIFICATIVA_MIN_LENGTH) {
            throw new PreRequisitosException(
                    "Justificativa de cancelamento deve ter no mínimo %d caracteres".formatted(JUSTIFICATIVA_MIN_LENGTH));
        }

        ProcessoDistribuicao processo = processoRepository.findById(cmd.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + cmd.processoId()));

        // Capturar before ANTES de mutar
        ProcessoSnapshot antes = ProcessoSnapshot.from(processo);

        processo.cancelar(cmd.justificativa());
        processo = processoRepository.save(processo);

        outboxEventWriter.addEvent(EVENT_TYPE, processo.getId().toString(), buildPayload(processo));

        AuditContext auditCtx = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.CANCEL));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CANCEL, antes), auditCtx));

        LOGGER.warn("distribuicao.processo.cancelado processoId={} rubricaSigla={} periodo={} justificativa={}",
                processo.getId(), processo.getRubricaSigla(), processo.getPeriodo(), cmd.justificativa());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayload(ProcessoDistribuicao processo) {
        return Map.of(
                "processoId", processo.getId().toString(),
                "rubricaSigla", processo.getRubricaSigla(),
                "periodo", processo.getPeriodo(),
                "status", processo.getStatus().name(),
                "justificativa", processo.getJustificativaCancelamento());
    }
}
