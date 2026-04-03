namespace Cadastro.Application.Busca.Responses;

public record BuscaCadastroResponse(IEnumerable<ResultadoBuscaDto> Resultados);

public record ResultadoBuscaDto(
    string Tipo,
    Guid Id,
    Guid? ObraId,
    string Titulo,
    string? Isrc,
    string? Iswc,
    string? Interpretes,
    string Status
);
