namespace Identificacao.Application.Storage;

public interface IStorageServiceClient
{
    Task<StorageFileResult> UploadAsync(
        Stream conteudo, string contentType, string nomeArquivo, CancellationToken cancellationToken);

    Task<StorageFileResult> GetMetadataAsync(
        string storageFileId, CancellationToken cancellationToken);

    Task<Stream> DownloadAsync(
        string storageFileId, CancellationToken cancellationToken);
}

public record StorageFileResult(
    string Id,
    string OriginalName,
    long SizeBytes,
    string ContentType,
    string Status
);
