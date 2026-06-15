using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Filtros para listagem paginada de solicitações de alteração.
/// Todos os parâmetros de busca são opcionais — null = sem filtro.
/// </summary>
public record SolicitacaoFiltro(
    int Page = 1,
    int Size = 20,
    StatusSolicitacao? Status = null,
    Guid? TitularId = null,
    CampoSolicitacao? Campo = null);
