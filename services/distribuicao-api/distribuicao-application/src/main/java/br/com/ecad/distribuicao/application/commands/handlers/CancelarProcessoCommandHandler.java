package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.GenericAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.com.ecad.distribuicao.application.commands.CancelarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.services.AjusteEstornoAplicacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.application.services.ResultadoAjustesEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.org.ecad.audit.contract.DataAction;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.exceptions.PreRequisitosException;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.time.Instant;
import java.util.LinkedHashMap;
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
    private static final String ENTITY_TYPE = "ProcessoDistribuicao";
    private static final String SCREEN_ID = "DISTRIBUICAO_PROCESSOS";
    private static final String SCREEN_NAME = "Processos de Distribuição";

    private final ProcessoRepository processoRepository;
    private final CreditoRetidoLiberacaoService creditoRetidoLiberacaoService;
    private final AjusteEstornoAplicacaoService ajusteEstornoAplicacaoService;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;
    private final GenericAuditEventFactory genericAuditEventFactory;

    public CancelarProcessoCommandHandler(
            ProcessoRepository processoRepository,
            CreditoRetidoLiberacaoService creditoRetidoLiberacaoService,
            AjusteEstornoAplicacaoService ajusteEstornoAplicacaoService,
            OutboxEventWriter outboxEventWriter,
            AuditClient auditClient,
            AuditContextProvider auditContextProvider,
            ProcessoAuditEventFactory auditEventFactory,
            GenericAuditEventFactory genericAuditEventFactory) {
        this.processoRepository = processoRepository;
        this.creditoRetidoLiberacaoService = creditoRetidoLiberacaoService;
        this.ajusteEstornoAplicacaoService = ajusteEstornoAplicacaoService;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditContextProvider = auditContextProvider;
        this.auditEventFactory = auditEventFactory;
        this.genericAuditEventFactory = genericAuditEventFactory;
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

        Instant canceladoEm = Instant.now();
        processo.cancelar(cmd.justificativa(), canceladoEm);
        creditoRetidoLiberacaoService.cancelarLiberacoesPrevistas(processo.getId(), canceladoEm);
        ResultadoAjustesEstorno resultadoAjustes =
                ajusteEstornoAplicacaoService.cancelarPrevisoes(processo.getId(), canceladoEm);
        processo = processoRepository.save(processo);

        outboxEventWriter.addEvent(EVENT_TYPE, processo.getId().toString(), buildPayload(processo, resultadoAjustes));

        AuditContext auditCtx = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.CANCEL));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.CANCEL, antes), auditCtx));

        // Auditoria suplementar indicando reversão de ajustes de estorno
        if (resultadoAjustes.total() > 0) {
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("ajustesEstornoRevertidos",
                    resultadoAjustes.ajustes().stream().map(AjusteEstorno::getId).toList());
            after.put("totalAjustesEstornoDevolvidos", resultadoAjustes.total());
            after.put("valorTotalAjustesEstornoDevolvidos", resultadoAjustes.valorTotal());
            auditClient.publish(genericAuditEventFactory.dataChange(
                    ENTITY_TYPE, processo.getId().toString(), DataAction.UPDATE,
                    null, after,
                    "Ajustes de estorno revertidos no cancelamento do processo",
                    SCREEN_ID, SCREEN_NAME, auditCtx));
        }

        LOGGER.warn(
                "distribuicao.processo.cancelado processoId={} rubricaSigla={} periodo={} justificativa={} totalAjustesRevertidos={} valorTotalAjustesRevertidos={}",
                processo.getId(), processo.getRubricaSigla(), processo.getPeriodo(), cmd.justificativa(),
                resultadoAjustes.total(), resultadoAjustes.valorTotal());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayload(ProcessoDistribuicao processo, ResultadoAjustesEstorno resultadoAjustes) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("processoId", processo.getId().toString());
        payload.put("rubricaSigla", processo.getRubricaSigla());
        payload.put("periodo", processo.getPeriodo());
        payload.put("status", processo.getStatus().name());
        payload.put("justificativa", processo.getJustificativaCancelamento());
        payload.put("totalAjustesEstornoDevolvidos", resultadoAjustes.total());
        payload.put("valorTotalAjustesEstornoDevolvidos", resultadoAjustes.valorTotal());
        return payload;
    }
}
