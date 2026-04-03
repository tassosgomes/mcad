namespace Identificacao.Domain.Interfaces;

public interface ICadastroHttpClient
{
    Task<BuscaCadastroResponse> BuscarAsync(string query, string? tipo, int size, CancellationToken ct);
    Task<ObraResumoDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct);
    Task<FonogramaResumoDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct);
}

public record ObraResumoDto(Guid Id, string Titulo, string? Iswc, string Status);
public record FonogramaResumoDto(Guid Id, Guid ObraId, string Titulo, string? Isrc, string? Interpretes, string Status);
public record BuscaCadastroResponse(IEnumerable<ResultadoBuscaDto> Resultados);
public record ResultadoBuscaDto(string Tipo, Guid Id, Guid? ObraId, string Titulo, string? Isrc, string? Iswc, string? Interpretes, string Status);
