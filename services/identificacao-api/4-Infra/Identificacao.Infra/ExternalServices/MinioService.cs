using Amazon.S3;
using Amazon.S3.Model;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Infra.ExternalServices;

public class MinioService : IMinioService
{
    private readonly IAmazonS3 _client;
    private readonly string _bucket;

    public MinioService(IAmazonS3 client)
    {
        _client = client;
        _bucket = Environment.GetEnvironmentVariable("R2_BUCKET") ?? "identificacao-uploads";
    }

    public async Task<string> UploadAsync(string key, Stream stream, string contentType, CancellationToken ct)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = stream,
            ContentType = contentType,
            DisablePayloadSigning = true,
        }, ct);
        return key;
    }

    public async Task<Stream> DownloadAsync(string key, CancellationToken ct)
    {
        using var response = await _client.GetObjectAsync(new GetObjectRequest
        {
            BucketName = _bucket,
            Key = key,
        }, ct);

        var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms, ct);
        ms.Position = 0;
        return ms;
    }
}
