namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// DTO de um fonograma na perspectiva do titular autenticado (RF-23).
/// Contém o título da obra vinculada, o ISRC e o papel/percentual do titular.
/// </summary>
public record FonogramaTitularResponse(
    Guid FonogramaId,
    string TituloObra,
    string Isrc,
    string Papel,
    decimal? Percentual);
