namespace Identificacao.Application.Dashboard;

/// <summary>
/// Resposta do resumo da dashboard para o domínio de Identificação.
/// Contém métricas de match, pendentes e captações.
/// </summary>
public record DashboardResumoResponse(
    double TaxaMatch,
    long TotalPendentes,
    int CaptacoesAtivas,
    string? UltimoLoteDescricao,
    IReadOnlyList<DashboardAlerta> Alertas);

public record DashboardAlerta(string Tipo, string Mensagem);
