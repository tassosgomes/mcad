using Ecad.Audit.Contract;

namespace Cadastro.Application.Audit;

public sealed record FonogramaAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    public static readonly FonogramaAuditOperation Create = new(
        "CADASTRAR_FONOGRAMA",
        "Cadastrar fonograma",
        "Fonograma cadastrado",
        DataAction.CREATE);

    public static readonly FonogramaAuditOperation Update = new(
        "ATUALIZAR_FONOGRAMA",
        "Atualizar fonograma",
        "Fonograma atualizado",
        DataAction.UPDATE);

    public static readonly FonogramaAuditOperation Delete = new(
        "EXCLUIR_FONOGRAMA",
        "Excluir fonograma",
        "Fonograma excluído",
        DataAction.DELETE);

    public static readonly FonogramaAuditOperation Depurate = new(
        "DEPURAR_FONOGRAMA",
        "Depurar fonograma",
        "Fonograma depurado",
        DataAction.UPDATE);

    public static readonly FonogramaAuditOperation Release = new(
        "LIBERAR_FONOGRAMA",
        "Liberar fonograma",
        "Fonograma liberado",
        DataAction.UPDATE);

    public static readonly FonogramaAuditOperation Block = new(
        "BLOQUEAR_FONOGRAMA",
        "Bloquear fonograma",
        "Fonograma bloqueado",
        DataAction.UPDATE);

    public static readonly FonogramaAuditOperation Unblock = new(
        "DESBLOQUEAR_FONOGRAMA",
        "Desbloquear fonograma",
        "Fonograma desbloqueado",
        DataAction.UPDATE);

    public static readonly FonogramaAuditOperation SetUrlAudio = new(
        "DEFINIR_URL_AUDIO_FONOGRAMA",
        "Definir URL de áudio do fonograma",
        "URL de áudio do fonograma alterada",
        DataAction.UPDATE);
}
