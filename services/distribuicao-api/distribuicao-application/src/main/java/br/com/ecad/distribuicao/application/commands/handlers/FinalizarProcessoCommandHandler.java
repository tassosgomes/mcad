package br.com.ecad.distribuicao.application.commands.handlers;

import br.com.ecad.distribuicao.application.audit.AuditContext;
import br.com.ecad.distribuicao.application.audit.AuditContextProvider;
import br.com.ecad.distribuicao.application.audit.GenericAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditChange;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditEventFactory;
import br.com.ecad.distribuicao.application.audit.ProcessoAuditOperation;
import br.com.ecad.distribuicao.application.audit.ProcessoSnapshot;
import br.org.ecad.audit.contract.DataAction;
import br.com.ecad.distribuicao.application.commands.FinalizarProcessoCommand;
import br.com.ecad.distribuicao.application.dto.ProcessoResponse;
import br.com.ecad.distribuicao.application.services.AjusteEstornoAplicacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService;
import br.com.ecad.distribuicao.application.services.CreditoRetidoLiberacaoService.ResultadoLiberacaoRetidos;
import br.com.ecad.distribuicao.application.services.ResultadoAjustesEstorno;
import br.com.ecad.distribuicao.domain.entities.AjusteEstorno;
import br.com.ecad.distribuicao.domain.entities.Credito;
import br.com.ecad.distribuicao.domain.entities.CreditoLiberacao;
import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;
import br.com.ecad.distribuicao.domain.entities.SnapshotRol;
import br.com.ecad.distribuicao.domain.exceptions.NotFoundException;
import br.com.ecad.distribuicao.domain.interfaces.CreditoRepository;
import br.com.ecad.distribuicao.domain.interfaces.OutboxEventWriter;
import br.com.ecad.distribuicao.domain.interfaces.ProcessoRepository;
import br.com.ecad.distribuicao.domain.interfaces.SnapshotRolRepository;
import br.org.ecad.audit.sdk.AuditClient;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class FinalizarProcessoCommandHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(FinalizarProcessoCommandHandler.class);
    private static final String EVENT_FINALIZADO = "distribuicao.processo.finalizado";
    private static final String EVENT_ROL_PROCESSADO = "distribuicao.rol.processado";
    private static final String EVENT_CREDITO_LIBERADO = "distribuicao.credito.liberado";

    private static final String ENTITY_TYPE = "ProcessoDistribuicao";
    private static final String SCREEN_ID = "DISTRIBUICAO_PROCESSOS";
    private static final String SCREEN_NAME = "Processos de Distribuição";

    private final ProcessoRepository processoRepository;
    private final CreditoRepository creditoRepository;
    private final SnapshotRolRepository snapshotRolRepository;
    private final CreditoRetidoLiberacaoService creditoRetidoLiberacaoService;
    private final AjusteEstornoAplicacaoService ajusteEstornoAplicacaoService;
    private final OutboxEventWriter outboxEventWriter;
    private final AuditClient auditClient;
    private final AuditContextProvider auditContextProvider;
    private final ProcessoAuditEventFactory auditEventFactory;
    private final GenericAuditEventFactory genericAuditEventFactory;

    public FinalizarProcessoCommandHandler(
            ProcessoRepository processoRepository,
            CreditoRepository creditoRepository,
            SnapshotRolRepository snapshotRolRepository,
            CreditoRetidoLiberacaoService creditoRetidoLiberacaoService,
            AjusteEstornoAplicacaoService ajusteEstornoAplicacaoService,
            OutboxEventWriter outboxEventWriter,
            AuditClient auditClient,
            AuditContextProvider auditContextProvider,
            ProcessoAuditEventFactory auditEventFactory,
            GenericAuditEventFactory genericAuditEventFactory) {
        this.processoRepository = processoRepository;
        this.creditoRepository = creditoRepository;
        this.snapshotRolRepository = snapshotRolRepository;
        this.creditoRetidoLiberacaoService = creditoRetidoLiberacaoService;
        this.ajusteEstornoAplicacaoService = ajusteEstornoAplicacaoService;
        this.outboxEventWriter = outboxEventWriter;
        this.auditClient = auditClient;
        this.auditContextProvider = auditContextProvider;
        this.auditEventFactory = auditEventFactory;
        this.genericAuditEventFactory = genericAuditEventFactory;
    }

    @Transactional
    public ProcessoResponse handle(FinalizarProcessoCommand cmd) {
        ProcessoDistribuicao processo = processoRepository.findById(cmd.processoId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de distribuição não encontrado: " + cmd.processoId()));

        // Capturar before ANTES de mutar
        ProcessoSnapshot antes = ProcessoSnapshot.from(processo);

        Instant finalizadoEm = Instant.now();
        processo.finalizar(finalizadoEm);
        ResultadoLiberacaoRetidos resultadoLiberacao =
                creditoRetidoLiberacaoService.efetivarLiberacoes(processo, finalizadoEm);
        ResultadoAjustesEstorno resultadoAjustes =
                ajusteEstornoAplicacaoService.efetivarAjustes(processo, finalizadoEm);
        processo = processoRepository.save(processo);

        UUID captacaoId = processo.getSnapshotRolId() == null ? null
                : snapshotRolRepository.findById(processo.getSnapshotRolId())
                        .map(SnapshotRol::getCaptacaoId)
                        .orElse(null);

        for (CreditoLiberacao liberacao : resultadoLiberacao.liberacoes()) {
            publishCreditoLiberado(processo, liberacao);
        }

        // 2 eventos de domínio para finalização
        outboxEventWriter.addEvent(EVENT_FINALIZADO, processo.getId().toString(),
                buildPayloadFinalizado(processo, resultadoAjustes));
        outboxEventWriter.addEvent(EVENT_ROL_PROCESSADO, processo.getId().toString(),
                buildPayloadRolProcessado(processo, captacaoId));

        AuditContext auditCtx = auditContextProvider.current(cmd.autor());
        auditClient.publish(auditEventFactory.userAction(processo, auditCtx, ProcessoAuditOperation.FINALIZE));
        auditClient.publish(auditEventFactory.dataChange(
                new ProcessoAuditChange(processo, ProcessoAuditOperation.FINALIZE, antes), auditCtx));

        // Auditoria suplementar com totais de ajustes de estorno efetivados
        if (resultadoAjustes.total() > 0) {
            Map<String, Object> after = new LinkedHashMap<>();
            after.put("ajustesEstornoIds",
                    resultadoAjustes.ajustes().stream().map(AjusteEstorno::getId).toList());
            after.put("totalAjustesEstorno", resultadoAjustes.total());
            after.put("valorTotalAjustesEstorno", resultadoAjustes.valorTotal());
            auditClient.publish(genericAuditEventFactory.dataChange(
                    ENTITY_TYPE, processo.getId().toString(), DataAction.UPDATE,
                    null, after,
                    "Ajustes de estorno efetivados na finalização do processo",
                    SCREEN_ID, SCREEN_NAME, auditCtx));
        }

        LOGGER.info(
                "distribuicao.processo.finalizado processoId={} rubricaSigla={} periodo={} totalRetidosLiberados={} valorTotalRetidosLiberados={} totalAjustesEstorno={} valorTotalAjustesEstorno={}",
                processo.getId(),
                processo.getRubricaSigla(),
                processo.getPeriodo(),
                resultadoLiberacao.total(),
                resultadoLiberacao.valorTotal(),
                resultadoAjustes.total(),
                resultadoAjustes.valorTotal());

        return ProcessoResponse.from(processo);
    }

    private Map<String, Object> buildPayloadFinalizado(
            ProcessoDistribuicao processo,
            ResultadoAjustesEstorno resultadoAjustes) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("processoId", processo.getId().toString());
        payload.put("rubricaSigla", processo.getRubricaSigla());
        payload.put("periodo", processo.getPeriodo());
        payload.put("status", processo.getStatus().name());
        payload.put("totalCreditosRetidosLiberados", zeroIfNull(processo.getTotalCreditosRetidosLiberados()));
        payload.put("valorTotalRetidosLiberados", zeroIfNull(processo.getValorTotalRetidosLiberados()));
        payload.put("totalAjustesEstorno", resultadoAjustes.total());
        payload.put("valorTotalAjustesEstorno", resultadoAjustes.valorTotal());
        return payload;
    }

    private Map<String, Object> buildPayloadRolProcessado(ProcessoDistribuicao processo, UUID captacaoId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("processoId", processo.getId().toString());
        payload.put("rubricaSigla", processo.getRubricaSigla());
        payload.put("periodo", processo.getPeriodo());
        if (captacaoId != null) {
            payload.put("captacaoId", captacaoId.toString());
        }
        return payload;
    }

    private void publishCreditoLiberado(ProcessoDistribuicao processoLiberacao, CreditoLiberacao liberacao) {
        Credito credito = creditoRepository.findById(liberacao.getCreditoRetidoId())
                .orElseThrow(() -> new NotFoundException(
                        "Crédito liberado não encontrado: " + liberacao.getCreditoRetidoId()));
        ProcessoDistribuicao processoOrigem = processoRepository.findById(liberacao.getProcessoOrigemId())
                .orElseThrow(() -> new NotFoundException(
                        "Processo de origem da liberação não encontrado: " + liberacao.getProcessoOrigemId()));
        outboxEventWriter.addEvent(
                EVENT_CREDITO_LIBERADO,
                credito.getId().toString(),
                buildPayloadCreditoLiberado(processoLiberacao, processoOrigem, credito, liberacao));
    }

    private Map<String, Object> buildPayloadCreditoLiberado(
            ProcessoDistribuicao processoLiberacao,
            ProcessoDistribuicao processoOrigem,
            Credito credito,
            CreditoLiberacao liberacao) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("creditoId", credito.getId().toString());
        payload.put("processoOrigemId", processoOrigem.getId().toString());
        payload.put("processoLiberacaoId", processoLiberacao.getId().toString());
        payload.put("rubricaSigla", processoLiberacao.getRubricaSigla());
        payload.put("periodoOrigem", processoOrigem.getPeriodo());
        payload.put("periodoLiberacao", processoLiberacao.getPeriodo());
        payload.put("titularId", credito.getTitularId().toString());
        payload.put("titularNome", credito.getTitularNome());
        payload.put("obraId", credito.getObraId().toString());
        payload.put("obraTitulo", credito.getObraTitulo());
        payload.put("fonogramaId", credito.getFonogramaId() == null ? null : credito.getFonogramaId().toString());
        payload.put("categoria", credito.getCategoria().name());
        payload.put(
                "subcategoriaConexa",
                credito.getSubcategoriaConexa() == null ? null : credito.getSubcategoriaConexa().name());
        payload.put("valorLiberado", liberacao.getValorLiberado());
        payload.put("motivoRetencaoOriginal", liberacao.getMotivoRetencaoOriginal().name());
        payload.put("retidoEm", credito.getRetidoEm());
        payload.put("liberadoEm", credito.getLiberadoEm());
        return payload;
    }

    private Integer zeroIfNull(Integer value) {
        return value == null ? 0 : value;
    }

    private java.math.BigDecimal zeroIfNull(java.math.BigDecimal value) {
        return value == null ? java.math.BigDecimal.ZERO : value;
    }
}
