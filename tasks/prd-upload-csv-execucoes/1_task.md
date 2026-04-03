---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>docker</dependencies>
<unblocks>"3.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 1.0: Infraestrutura — MinIO no Docker Compose + MinioService

## Visão Geral

Adicionar MinIO como serviço no docker-compose, criar o wrapper `MinioService` com operações de upload e download, e configurar o client no Program.cs.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IMinioService.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/MinioService.cs`
- **Modificar:**
  - `docker-compose.dev.yml` (adicionar serviço mcad-minio + volume)
  - `services/identificacao-api/1-Services/Identificacao.API/Identificacao.API.csproj` (pacote Minio)
  - `services/identificacao-api/.env.example` (vars MinIO)
- **Referência:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/ExternalServices/IswcService.cs` (padrão de serviço externo)

## Subtarefas

- [ ] 1.1 Adicionar MinIO ao `docker-compose.dev.yml`: imagem `minio/minio:latest`, portas 9000 (API) e 9001 (console), volume persistente, health check
- [ ] 1.2 Adicionar pacote `Minio` ao API.csproj
- [ ] 1.3 Criar interface `IMinioService` no Domain (UploadAsync, DownloadAsync)
- [ ] 1.4 Criar `MinioService` no Infra — bucket `identificacao-uploads`, auto-create bucket
- [ ] 1.5 Atualizar `.env.example` com `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- [ ] 1.6 Testar: `docker compose up mcad-minio` + console em http://localhost:9001

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 3.0, 5.0, 6.0
- Paralelizável: Sim

## Detalhes de Implementação

**docker-compose.dev.yml:**
```yaml
mcad-minio:
  image: minio/minio:latest
  container_name: mcad-minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  ports:
    - "9000:9000"
    - "9001:9001"
  volumes:
    - mcad_minio_data:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 5s
    timeout: 3s
    retries: 5
```

**MinioService:**
```csharp
public class MinioService : IMinioService
{
    private readonly IMinioClient _client;
    private const string BucketName = "identificacao-uploads";

    public MinioService(IMinioClient client) => _client = client;

    public async Task<string> UploadAsync(string key, Stream stream, string contentType, CancellationToken ct)
    {
        await EnsureBucketExistsAsync(ct);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(BucketName).WithObject(key)
            .WithStreamData(stream).WithObjectSize(stream.Length)
            .WithContentType(contentType), ct);
        return key;
    }

    public async Task<Stream> DownloadAsync(string key, CancellationToken ct)
    {
        var ms = new MemoryStream();
        await _client.GetObjectAsync(new GetObjectArgs()
            .WithBucket(BucketName).WithObject(key)
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
```

**Program.cs — registro do MinIO:**
```csharp
var minioEndpoint = Environment.GetEnvironmentVariable("MINIO_ENDPOINT") ?? "localhost:9000";
var minioAccessKey = Environment.GetEnvironmentVariable("MINIO_ACCESS_KEY") ?? "minioadmin";
var minioSecretKey = Environment.GetEnvironmentVariable("MINIO_SECRET_KEY") ?? "minioadmin";

builder.Services.AddSingleton<IMinioClient>(_ =>
    new MinioClient()
        .WithEndpoint(minioEndpoint)
        .WithCredentials(minioAccessKey, minioSecretKey)
        .Build());
builder.Services.AddScoped<IMinioService, MinioService>();
```

**.env.example:**
```
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## Critérios de Sucesso (Verificáveis)

- [ ] MinIO inicia: `docker compose up mcad-minio` sem erros
- [ ] Console acessível: http://localhost:9001 (login minioadmin/minioadmin)
- [ ] Build compila: `cd services/identificacao-api && dotnet build`
