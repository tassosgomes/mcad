using System;

namespace Identificacao.Application.Uploads.Services;

public record CsvLinhaAgrupada(
    string? Isrc,
    string? Iswc,
    TimeOnly Inicio,
    TimeOnly Fim,
    string? TipoUtilizacao,
    string? TituloPrograma,
    int Quantidade
)
{
    public CsvLinhaAgrupada() : this(default, default, default, default, default, default, default) { }
}
