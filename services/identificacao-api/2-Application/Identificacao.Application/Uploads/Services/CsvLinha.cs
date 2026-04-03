using System;

namespace Identificacao.Application.Uploads.Services;

public record CsvLinha(
    int NumeroLinha,
    string? Isrc,
    string? Iswc,
    TimeOnly Inicio,
    TimeOnly Fim,
    string? TipoUtilizacao,
    string? TituloPrograma
);
