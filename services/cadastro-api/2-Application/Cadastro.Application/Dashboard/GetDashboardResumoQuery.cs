using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Dashboard;

/// <summary>
/// Query para obter o resumo da dashboard do domínio de Cadastro.
/// Executa COUNTs leves nas tabelas principais — sem paginação.
/// </summary>
public record GetDashboardResumoQuery : IQuery<DashboardResumoResponse>;
