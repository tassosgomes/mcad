package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.com.ecad.distribuicao.application.commands.FinalizarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class FinalizarProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(FinalizarProcessoCommandHandler.class);
    private static final String EVENT_FINALIZADO = "distribuicao.processo.finalizado";
    private static final String EVENT_ROL_PROCESSADO = "distribuicao.rol.processado";

    private final ProcessoRepository processoRepository;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;

    public FinalizarProcessoCommandHandler(
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
    public ProcessoResponse handle(FinalizarProcessoCommand cmd) {
        ProcessoDistribuicao processo = processoRepository.findById(cmd.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + cmd.processoId()));

        // Capturar before ANTES de mutar
        ProcessoSnapshot antes = ProcessoSnapshot.from(processo);

        processo.finalizar();
        processo = processoRepository.save(processo);

        // 2 eventos de domínio para finalização
        outboxEventWriter.addEvent(EVENT_FINALIZADO, processo.getId().toString(), buildPayloadFinalizado(processo));
        outboxEventWriter.addEvent(EVENT_ROL_PROCESSADO, processo.getId().toString(),
                buildPayloadRolProcessado(processo));

        AuditContext auditCtx = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.FINALIZE));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.FINALIZE, antes), auditCtx));

        LOGGER.info("distribuicao.processo.finalizado processoId={} rubricaSigla={} periodo={}",
                processo.getId(), processo.getRubricaSigla(), processo.getPeriodo());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayloadFinalizado(ProcessoDistribuicao processo) {
        return Map.of(
                "processoId", processo.getId().toString(),
                "rubricaSigla", processo.getRubricaSigla(),
                "periodo", processo.getPeriodo(),
                "status", processo.getStatus().name());
    }

    private Map<String, Object> buildPayloadRolProcessado(ProcessoDistribuicao processo) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("processoId", processo.getId().toString());
        payload.put("rubricaSigla", processo.getRubricaSigla());
        payload.put("periodo", processo.getPeriodo());
        if (processo.getSnapshotRolId() != null) {
            payload.put("captacaoId", processo.getSnapshotRolId().toString());
        }
        return payload;
    }
}
