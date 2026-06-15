using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Filtros para listagem paginada de ocorrências.
/// Todos os parâmetros de busca são opcionais — null = sem filtro.
/// </summary>
public record OcorrenciaFiltro(
    int Page = 1,
    int Size = 20,
    StatusOcorrencia? Status = null,
    Guid? TitularId = null,
    TipoOcorrencia? Tipo = null);
