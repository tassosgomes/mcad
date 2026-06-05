using Identificacao.Application.Common;

namespace Identificacao.Application.Dashboard;

/// <summary>
/// Query para obter o resumo da dashboard do domínio de Identificação.
/// </summary>
public record GetDashboardResumoQuery : IQuery<DashboardResumoResponse>;
