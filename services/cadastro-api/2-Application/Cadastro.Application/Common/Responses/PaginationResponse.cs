namespace Cadastro.Application.Common.Responses;

/// <summary>
/// Response de paginação reutilizável em todas as listagens paginadas.
/// Inclui metadados necessários para o frontend renderizar os controles de paginação.
/// </summary>
public record PaginationResponse(
    int Page,
    int Size,
    int Total,
    int TotalPages);
