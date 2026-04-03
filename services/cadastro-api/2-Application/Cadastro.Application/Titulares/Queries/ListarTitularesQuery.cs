using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Enums;

namespace Cadastro.Application.Titulares.Queries;

/// <summary>
/// Query para listagem paginada de titulares com filtros e ordenação.
/// Parâmetros opcionais: null = sem filtro.
/// </summary>
public record ListarTitularesQuery(
    int Page = 1,
    int Size = 20,
    string? Sort = "nome",
    long? Codigo = null,
    string? Nome = null,
    string? Documento = null,
    Guid? AssociacaoId = null,
    StatusTitular? Status = null
) : IQuery<TitularListResponse>;
