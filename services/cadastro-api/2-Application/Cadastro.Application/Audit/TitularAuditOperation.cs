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
}
