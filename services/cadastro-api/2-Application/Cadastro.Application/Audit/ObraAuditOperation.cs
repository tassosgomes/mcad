using Ecad.Audit.Contract;

namespace Cadastro.Application.Audit;

public sealed record ObraAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    public static readonly ObraAuditOperation Create = new(
        "CADASTRAR_OBRA",
        "Cadastrar obra",
        "Obra cadastrada",
        DataAction.CREATE);

    public static readonly ObraAuditOperation Update = new(
        "ATUALIZAR_OBRA",
        "Atualizar obra",
        "Obra atualizada",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation Delete = new(
        "EXCLUIR_OBRA",
        "Excluir obra",
        "Obra excluída",
        DataAction.DELETE);

    public static readonly ObraAuditOperation ObtainIswc = new(
        "OBTER_ISWC_OBRA",
        "Obter ISWC da obra",
        "ISWC obtido para obra",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation Depurate = new(
        "DEPURAR_OBRA",
        "Depurar obra",
        "Obra depurada",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation SetPublicDomain = new(
        "ALTERAR_DOMINIO_PUBLICO_OBRA",
        "Alterar domínio público da obra",
        "Domínio público da obra alterado",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation Release = new(
        "LIBERAR_OBRA",
        "Liberar obra",
        "Obra liberada",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation Block = new(
        "BLOQUEAR_OBRA",
        "Bloquear obra",
        "Obra bloqueada",
        DataAction.UPDATE);

    public static readonly ObraAuditOperation Unblock = new(
        "DESBLOQUEAR_OBRA",
        "Desbloquear obra",
        "Obra desbloqueada",
        DataAction.UPDATE);
}
