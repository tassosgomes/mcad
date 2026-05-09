using Ecad.Audit.Contract;

namespace Cadastro.Application.Audit;

public sealed record ParticipacaoAuditOperation(
    string ActionCode,
    string ActionName,
    string Reason,
    DataAction DataAction)
{
    public static readonly ParticipacaoAuditOperation Add = new(
        "ADICIONAR_PARTICIPACAO",
        "Adicionar participação conexa",
        "Participação conexa adicionada ao fonograma",
        DataAction.CREATE);

    public static readonly ParticipacaoAuditOperation Adjust = new(
        "AJUSTAR_PARTICIPACAO",
        "Ajustar percentual de participação",
        "Percentual de participação alterado manualmente",
        DataAction.UPDATE);

    public static readonly ParticipacaoAuditOperation Calculate = new(
        "CALCULAR_PERCENTUAIS_PARTICIPACAO",
        "Calcular percentuais de participação",
        "Percentuais de participação recalculados",
        DataAction.UPDATE);

    public static readonly ParticipacaoAuditOperation Remove = new(
        "REMOVER_PARTICIPACAO",
        "Remover participação conexa",
        "Participação conexa removida",
        DataAction.DELETE);
}
