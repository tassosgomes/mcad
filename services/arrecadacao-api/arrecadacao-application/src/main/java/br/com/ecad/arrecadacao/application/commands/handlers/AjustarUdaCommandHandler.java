package br.com.ecad.arrecadacao.application.commands.handlers;

import br.com.ecad.arrecadacao.application.audit.AuditContextProvider;
import br.com.ecad.arrecadacao.application.audit.GenericAuditEventFactory;
import br.com.ecad.arrecadacao.application.commands.AjustarUdaCommand;
import br.com.ecad.arrecadacao.application.cqrs.CommandHandler;
import br.com.ecad.arrecadacao.application.dto.UdaResponse;
import br.com.ecad.arrecadacao.domain.entities.UdaValor;
import br.com.ecad.arrecadacao.domain.interfaces.UdaValorRepository;
import br.org.ecad.audit.contract.DataAction;
import br.org.ecad.audit.sdk.AuditClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Component
public class AjustarUdaCommandHandler implements CommandHandler<AjustarUdaCommand, UdaResponse> {

    private static final String ENTITY_TYPE = "UdaValor";
    private static final String SCREEN_ID = "ARRECADACAO_UDA";
    private static final String SCREEN_NAME = "UDA";

    private final UdaValorRepository udaValorRepository;
    private final AuditClient auditClient;
    private final GenericAuditEventFactory auditFactory;
    private final AuditContextProvider auditContextProvider;

    public AjustarUdaCommandHandler(UdaValorRepository udaValorRepository,
                                    AuditClient auditClient,
                                    GenericAuditEventFactory auditFactory,
                                    AuditContextProvider auditContextProvider) {
        this.udaValorRepository = udaValorRepository;
        this.auditClient = auditClient;
        this.auditFactory = auditFactory;
        this.auditContextProvider = auditContextProvider;
    }

    @Override
    @Transactional
    public UdaResponse handle(AjustarUdaCommand cmd) {
        // 1. Criar novo registro de UDA via factory (valida valor > 0 e dataVigencia != null)
        UdaValor udaValor = UdaValor.criar(cmd.valor(), cmd.dataVigencia(), cmd.autor());

        // 2. Persistir
        udaValor = udaValorRepository.save(udaValor);

        // 3. Auditoria
        var auditCtx = auditContextProvider.current(cmd.autor());
        var entityId = udaValor.getId().toString();
        auditClient.publish(auditFactory.userAction(
            ENTITY_TYPE, entityId,
            "AJUSTAR_VALOR_UDA", "Ajustar valor da UDA",
            "Valor da UDA ajustado", SCREEN_ID, SCREEN_NAME, auditCtx));
        auditClient.publish(auditFactory.dataChange(
            ENTITY_TYPE, entityId, DataAction.CREATE,
            null, mapUda(udaValor),
            "Valor da UDA ajustado", SCREEN_ID, SCREEN_NAME, auditCtx));

        // 4. Mapear para response
        return toResponse(udaValor);
    }

    private Map<String, Object> mapUda(UdaValor uda) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", uda.getId().toString());
        data.put("valor", uda.getValor().toPlainString());
        data.put("dataVigencia", uda.getDataVigencia() == null ? null : uda.getDataVigencia().toString());
        data.put("criadoEm", uda.getCriadoEm() == null ? null : uda.getCriadoEm().toString());
        data.put("criadoPor", uda.getCriadoPor());
        return data;
    }

    private UdaResponse toResponse(UdaValor uda) {
        return new UdaResponse(
            uda.getId(),
            uda.getValor().toPlainString(),
            uda.getDataVigencia(),
            uda.getCriadoEm(),
            uda.getCriadoPor()
        );
    }
}
