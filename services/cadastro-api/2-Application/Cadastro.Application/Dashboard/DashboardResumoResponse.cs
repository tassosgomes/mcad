namespace Cadastro.Application.Dashboard;

/// <summary>
/// Resposta do resumo da dashboard para o domínio de Cadastro.
/// Retorna contagens agregadas das entidades principais.
/// </summary>
public record DashboardResumoResponse(
    long TotalObras,
    long TotalFonogramas,
    long TotalTitulares,
    long TotalAssociacoes,
    IReadOnlyList<DashboardAlerta> Alertas);

public record DashboardAlerta(string Tipo, string Mensagem);
