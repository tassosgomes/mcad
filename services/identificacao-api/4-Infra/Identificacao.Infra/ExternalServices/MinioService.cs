using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Interfaces;
using Minio;
using Minio.DataModel.Args;

namespace Identificacao.Infra.ExternalServices;

public class MinioService : IMinioService
{
    private readonly IMinioClient _client;
    private const string BucketName = "identificacao-uploads";

    public MinioService(IMinioClient client) => _client = client;

    public async Task<string> UploadAsync(string key, Stream stream, string contentType, CancellationToken ct)
    {
        await EnsureBucketExistsAsync(ct);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(BucketName)
            .WithObject(key)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(contentType), ct);
        return key;
    }

    public async Task<Stream> DownloadAsync(string key, CancellationToken ct)
    {
        var ms = new MemoryStream();
        await _client.GetObjectAsync(new GetObjectArgs()
            .WithBucket(BucketName)
            .WithObject(key)
            .WithCallbackStream(s => s.CopyTo(ms)), ct);
        ms.Position = 0;
        return ms;
    }

    private async Task EnsureBucketExistsAsync(CancellationToken ct)
    {
        var exists = await _client.BucketExistsAsync(new BucketExistsArgs().WithBucket(BucketName), ct);
        if (!exists)
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(BucketName), ct);
    }
}
