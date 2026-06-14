namespace Cadastro.Application.Storage;

public interface IStorageServiceClient
{
    Task<StorageFileResult> UploadAsync(
        Stream conteudo, string contentType, string nomeArquivo, CancellationToken cancellationToken);

    Task<StorageFileResult> ObterMetadadosAsync(
        string storageFileId, CancellationToken cancellationToken);

    Task<StorageDownloadUrlResult> ObterUrlDownloadAsync(
        string storageFileId, CancellationToken cancellationToken);

    Task ExcluirAsync(string storageFileId, CancellationToken cancellationToken);
}

public record StorageFileResult(
    string Id,
    string OriginalName,
    long SizeBytes,
    string ContentType,
    string Status
);

public record StorageDownloadUrlResult(string DownloadUrl, DateTimeOffset ExpiresAt);
