package br.com.ecad.distribuicao.application.audit;

import br.org.ecad.audit.contract.DataAction;

public enum ProcessoAuditOperation {

    CREATE("PROCESSO_DISTRIBUICAO_CREATE", "Criar processo", "Processo de distribuição criado", DataAction.CREATE),
    CALCULATE("PROCESSO_DISTRIBUICAO_CALCULATE", "Calcular processo", "Processo de distribuição calculado", DataAction.UPDATE),
    APPROVE("PROCESSO_DISTRIBUICAO_APPROVE", "Aprovar processo", "Processo de distribuição aprovado", DataAction.UPDATE),
    FINALIZE("PROCESSO_DISTRIBUICAO_FINALIZE", "Finalizar processo", "Processo de distribuição finalizado", DataAction.UPDATE),
    CANCEL("PROCESSO_DISTRIBUICAO_CANCEL", "Cancelar processo", "Processo de distribuição cancelado", DataAction.UPDATE);

    private final String code;
    private final String label;
    private final String reason;
    private final DataAction dataAction;

    ProcessoAuditOperation(String code, String label, String reason, DataAction dataAction) {
        this.code = code;
        this.label = label;
        this.reason = reason;
        this.dataAction = dataAction;
    }

    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public String reason() {
        return reason;
    }

    public DataAction dataAction() {
        return dataAction;
    }
}
