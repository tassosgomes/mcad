using System.Net.Http.Headers;
using System.Net.Http.Json;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cadastro.Infra.Storage;

/// <summary>
/// Cliente HTTP para o storage-service (https://storage.tasso.dev.br).
/// Proxy autenticado: o cadastro-api nunca expõe as credenciais M2M ao frontend.
/// </summary>
public class StorageServiceClient : IStorageServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly LogToM2MTokenService _tokenService;
    private readonly ILogger<StorageServiceClient> _logger;

    public StorageServiceClient(
        HttpClient httpClient,
        LogToM2MTokenService tokenService,
        ILogger<StorageServiceClient> logger)
    {
        _httpClient   = httpClient;
        _tokenService = tokenService;
        _logger       = logger;
    }

    public async Task<StorageFileResult> UploadAsync(
        Stream conteudo, string contentType, string nomeArquivo, CancellationToken cancellationToken)
    {
        var token = await _tokenService.ObterTokenAsync(cancellationToken);

        using var form = new MultipartFormDataContent();
        var streamContent = new StreamContent(conteudo);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(streamContent, "file", nomeArquivo);

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/v1/files") { Content = form };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Falha no upload ao storage-service: {Status} — {Body}", response.StatusCode, body);
            throw new ExternalServiceException("Não foi possível fazer upload do arquivo. Tente novamente.");
        }

        var dto = await response.Content.ReadFromJsonAsync<StorageFileDto>(cancellationToken: cancellationToken)
            ?? throw new ExternalServiceException("Resposta inválida do storage-service após upload.");

        return new StorageFileResult(dto.Id, dto.OriginalName, dto.SizeBytes, dto.ContentType, dto.Status);
    }

    public async Task<StorageFileResult> ObterMetadadosAsync(
        string storageFileId, CancellationToken cancellationToken)
    {
        var token = await _tokenService.ObterTokenAsync(cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/v1/files/{storageFileId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new NotFoundException("Arquivo no storage", storageFileId);

        response.EnsureSuccessStatusCode();

        var dto = await response.Content.ReadFromJsonAsync<StorageFileDto>(cancellationToken: cancellationToken)
            ?? throw new ExternalServiceException("Resposta inválida do storage-service ao consultar metadados.");

        return new StorageFileResult(dto.Id, dto.OriginalName, dto.SizeBytes, dto.ContentType, dto.Status);
    }

    public async Task<StorageDownloadUrlResult> ObterUrlDownloadAsync(
        string storageFileId, CancellationToken cancellationToken)
    {
        var token = await _tokenService.ObterTokenAsync(cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/v1/files/{storageFileId}/download");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            throw new ConflictException("Arquivo ainda em verificação de vírus. Aguarde alguns segundos e tente novamente.");

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new NotFoundException("Arquivo no storage", storageFileId);

        response.EnsureSuccessStatusCode();

        var dto = await response.Content.ReadFromJsonAsync<StorageDownloadUrlDto>(cancellationToken: cancellationToken)
            ?? throw new ExternalServiceException("Resposta inválida do storage-service ao obter URL de download.");

        return new StorageDownloadUrlResult(dto.DownloadUrl, dto.ExpiresAt);
    }

    public async Task ExcluirAsync(string storageFileId, CancellationToken cancellationToken)
    {
        var token = await _tokenService.ObterTokenAsync(cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"api/v1/files/{storageFileId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request, cancellationToken);

        // 404 é aceitável — o arquivo pode ter sido excluído automaticamente pelo ClamAV (infectado)
        if (response.StatusCode != System.Net.HttpStatusCode.NotFound)
            response.EnsureSuccessStatusCode();
    }
}
