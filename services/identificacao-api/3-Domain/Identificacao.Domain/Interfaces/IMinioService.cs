using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Identificacao.Domain.Interfaces;

public interface IMinioService
{
    Task<string> UploadAsync(string key, Stream stream, string contentType, CancellationToken ct);
    Task<Stream> DownloadAsync(string key, CancellationToken ct);
}
