using Ecad.Audit.Contract;

namespace Cadastro.Application.Audit;

public sealed record TitularAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    public static readonly TitularAuditOperation Create = new(
        "CADASTRAR_TITULAR",
        "Cadastrar titular",
        "Titular cadastrado",
        DataAction.CREATE);

    public static readonly TitularAuditOperation Update = new(
        "ATUALIZAR_TITULAR",
        "Atualizar titular",
        "Titular atualizado",
        DataAction.UPDATE);

    public static readonly TitularAuditOperation Delete = new(
        "EXCLUIR_TITULAR",
        "Excluir titular",
        "Titular excluído",
        DataAction.DELETE);

    /// <summary>
    /// Atualização dos dados de contato (RF-09 a RF-13).
    /// Reaproveita <see cref="DataAction.UPDATE"/> para que o diff before/after seja gerado
    /// pelo <see cref="TitularAuditEventFactory"/>.
    /// </summary>
    public static readonly TitularAuditOperation AtualizarContato = new(
        "ATUALIZAR_CONTATO_TITULAR",
        "Atualizar contato do titular",
        "Contato do titular atualizado pelo próprio titular no Portal",
        DataAction.UPDATE);

    /// <summary>
    /// Aprovação de solicitação de alteração de dado sensível pelo Analista (RF-16, RF-18).
    /// Aplica o efeito colateral no titular — registra diff antes/depois via
    /// <see cref="TitularAuditEventFactory"/> (RF-18).
    /// </summary>
    public static readonly TitularAuditOperation AprovacaoSolicitacao = new(
        "APROVAR_SOLICITACAO_ALTERACAO",
        "Aprovar solicitação de alteração",
        "Dado sensível do titular alterado via aprovação de solicitação pelo Analista",
        DataAction.UPDATE);
}
