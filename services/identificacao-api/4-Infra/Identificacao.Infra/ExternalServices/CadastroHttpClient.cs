using System.Net.Http.Json;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Infra.ExternalServices;

public class CadastroHttpClient : ICadastroHttpClient
{
    private readonly HttpClient _client;

    public CadastroHttpClient(HttpClient client)
    {
        _client = client;
    }

    public async Task<BuscaCadastroResponse> BuscarAsync(string query, string? tipo, int size, CancellationToken ct)
    {
        var url = $"/api/v1/busca?q={Uri.EscapeDataString(query)}&tipo={tipo ?? "todos"}&size={size}";
        var response = await _client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<BuscaCadastroResponse>(cancellationToken: ct);
        return result ?? new BuscaCadastroResponse(Enumerable.Empty<ResultadoBuscaDto>());
    }

    public async Task<ObraResumoDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/obras/{obraId}", ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ObraResumoDto>(cancellationToken: ct);
    }

    public async Task<FonogramaResumoDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/fonogramas/{fonogramaId}", ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FonogramaResumoDto>(cancellationToken: ct);
    }
}
