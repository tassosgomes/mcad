using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Ocorrencias.Responses;

namespace Cadastro.Application.Ocorrencias.Queries;

/// <summary>
/// Lista todas as ocorrências para triagem pelo analista (RF-33).
/// <para>
/// Diferente de <c>ListarMinhasOcorrenciasQuery</c>, esta query NÃO fixa
/// <c>TitularId</c> — o analista vê todas as ocorrências. Todos os filtros
/// são opcionais (null = sem filtro).
/// </para>
/// <para>
/// <c>Status</c> e <c>Tipo</c> são strings SCREAMING_SNAKE_CASE (ex:
/// <c>EM_ANALISE</c>, <c>TITULARIDADE_DIVERGENTE</c>); null = todos.
/// </para>
/// </summary>
public record ListarOcorrenciasQuery(
    string? Status = null,
    Guid? TitularId = null,
    string? Tipo = null,
    int Page = 1,
    int Size = 20) : IQuery<OcorrenciaListResponse>;
