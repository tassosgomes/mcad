using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Filtros para listagem paginada de titulares.
/// Todos os parâmetros de busca são opcionais — null = sem filtro.
/// Sort com prefixo "-" indica ordenação DESC (ex: "-nome" = nome DESC).
/// </summary>
public record TitularFiltro(
    int Page = 1,
    int Size = 20,
    string? Sort = "nome",
    string? Nome = null,
    string? Documento = null,
    Guid? AssociacaoId = null,
    StatusTitular? Status = null);
