namespace Cadastro.Application.Repertorios.Responses;

public record CadastroRepertorioResponse(
    Guid ObraId,
    string ObraTitulo,
    string StatusObra,
    string? Iswc,
    IReadOnlyCollection<FonogramaRepertorioResponse> Fonogramas,
    IReadOnlyCollection<TitularCriadoResponse> TitularesCriados,
    bool IswcObtido,
    string ObraLink,
    IReadOnlyCollection<string> FonogramaLinks);

public record FonogramaRepertorioResponse(
    Guid Id,
    string Isrc,
    string Status,
    string Link);

public record TitularCriadoResponse(
    Guid Id,
    string Nome,
    string Tipo,
    string DocumentoFormatado,
    string Associacao);
