using Ecad.Audit.Contract;

namespace Cadastro.Application.Audit;

public sealed record TitularidadeAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    public static readonly TitularidadeAuditOperation Add = new(
        "ADICIONAR_TITULARIDADE",
        "Adicionar titularidade autoral",
        "Titularidade autoral adicionada à obra",
        DataAction.CREATE);

    public static readonly TitularidadeAuditOperation Edit = new(
        "EDITAR_TITULARIDADE",
        "Editar titularidade autoral",
        "Titularidade autoral atualizada",
        DataAction.UPDATE);

    public static readonly TitularidadeAuditOperation Remove = new(
        "REMOVER_TITULARIDADE",
        "Remover titularidade autoral",
        "Titularidade autoral removida",
        DataAction.DELETE);
}
