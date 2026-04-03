using Cadastro.Domain.Enums;

namespace Cadastro.Application.Obras.Responses;

public record ObraResponse(
    Guid Id,
    long Codigo,
    string Titulo,
    string? Subtitulo,
    string Tipo,
    string? Genero,
    string? Iswc,
    string Status,
    bool DominioPublico,
    Guid? ObraDepuradaParaId,
    DateTime CriadoEm,
    DateTime AtualizadoEm,
    string? BloqueioJustificativa = null
);
