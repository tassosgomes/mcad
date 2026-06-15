namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// DTO de uma obra na perspectiva do titular autenticado (RF-22).
/// Contém os dados públicos da obra + a porcentagem do titular.
/// </summary>
public record ObraTitularResponse(
    Guid ObraId,
    string Titulo,
    string Categoria,
    string? Iswc,
    decimal Percentual);
