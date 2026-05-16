package br.com.ecad.distribuicao.application.audit;

import br.com.ecad.distribuicao.domain.entities.ProcessoDistribuicao;

public record ProcessoAuditChange(
        ProcessoDistribuicao processo,
        ProcessoAuditOperation operation,
        ProcessoSnapshot before
) {
}
