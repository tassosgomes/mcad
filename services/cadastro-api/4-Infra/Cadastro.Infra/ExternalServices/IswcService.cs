using System.Net.Http.Json;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Infra.ExternalServices;

public class IswcService : IIswcService
{
    private readonly HttpClient _httpClient;

    public IswcService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<string> ObterIswcAsync(string titulo, IEnumerable<string> autores, string associacaoSigla, CancellationToken ct)
    {
        try
        {
            var request = new { work_title = titulo, authors = autores.ToArray(), association_code = associacaoSigla };
            var response = await _httpClient.PostAsJsonAsync("api/iswc", request, ct);

            if (!response.IsSuccessStatusCode)
            {
                throw new ExternalServiceException("Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde.");
            }

            var result = await response.Content.ReadFromJsonAsync<IswcApiResponse>(cancellationToken: ct);
            return result?.Iswc ?? throw new ExternalServiceException("Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde.");
        }
        catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException)
        {
            throw new ExternalServiceException("Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde.", ex);
        }
    }
}

public class IswcApiResponse
{
    public string Iswc { get; set; } = string.Empty;
    // We can map other properties if we want to, but we only use Iswc.
}
