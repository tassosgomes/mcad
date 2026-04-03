namespace Cadastro.Application.Fonogramas.Responses;

public record FonogramaResponse(
    Guid Id,
    long Codigo,
    string Isrc,
    string IsrcFormatado,
    ObraResumoResponse Obra,
    string PaisOrigem,
    DateOnly? DataGravacao,
    DateOnly? DataLancamento,
    string Status,
    Guid? FonogramaDepuradoParaId,
    DateTime CriadoEm,
    DateTime AtualizadoEm,
    string? UrlAudio = null,
    string? BloqueioJustificativa = null
);
