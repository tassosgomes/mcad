# Especificação Técnica Backend — F03: Upload de Execuções via CSV

> **PRD:** `tasks/prd-upload-csv-execucoes/prd.md`
> **API Contract:** `tasks/prd-upload-csv-execucoes/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-03

---

## Resumo Executivo

Esta feature adiciona ao serviço de Identificação: integração com MinIO para armazenamento de arquivos, duas novas entidades (Upload e ErroUpload), um background worker para processamento assíncrono de CSV, lógica de parsing/validação/agrupamento/identificação, e endpoints REST para upload, status e relatório de erros.

O processamento reutiliza o `CadastroHttpClient` (F02) para identificação automática e o `ExecucaoRepository` para persistência. A principal complexidade está no pipeline de processamento: parse → validação por linha → detecção de duplicatas → agrupamento → consulta ao Cadastro → criação de execuções em batch.

---

## Arquitetura do Sistema

```
┌──────────────┐     ┌──────────────────────────┐     ┌─────────┐
│   Frontend    │────▶│  Identificação API :5100  │────▶│  MinIO  │
│              │     │                          │     │  :9000  │
│  POST upload │     │  ┌────────────────────┐  │     └─────────┘
│  GET status  │     │  │ CsvProcessorWorker │  │
│  GET erros   │     │  │ (Background Job)   │──┼──▶ Cadastro API :5001
│              │     │  └────────────────────┘  │
└──────────────┘     └──────────┬───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  PostgreSQL 16         │
                    │  schema: identificacao │
                    │  + uploads, erros      │
                    └───────────────────────┘
```

**Componentes novos:**
- **MinIO** — armazenamento S3-compatible (novo serviço no docker-compose)
- **IMinioClient** — wrapper para operações de upload/download
- **CsvProcessorWorker** — hosted service que processa uploads pendentes
- **CsvParser** — lógica de parsing, validação, agrupamento
- **Upload / ErroUpload** — entidades de domínio

---

## Design de Implementação

### Entidade: Upload

```csharp
public class Upload
{
    public Guid Id { get; private set; }
    public Guid CaptacaoId { get; private set; }
    public Captacao Captacao { get; private set; }
    public string NomeArquivo { get; private set; }
    public string MinioKey { get; private set; }
    public StatusUpload Status { get; private set; }
    public int? TotalLinhas { get; private set; }
    public int? ExecucoesCriadas { get; private set; }
    public int? TotalErros { get; private set; }
    public string? MensagemErro { get; private set; }
    public Guid AnalistaId { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime? ProcessadoEm { get; private set; }

    private Upload() { }

    public static Upload Criar(Guid captacaoId, string nomeArquivo, string minioKey, Guid analistaId) => new()
    {
        Id = Guid.NewGuid(),
        CaptacaoId = captacaoId,
        NomeArquivo = nomeArquivo,
        MinioKey = minioKey,
        Status = StatusUpload.Processando,
        AnalistaId = analistaId,
        CriadoEm = DateTime.UtcNow,
    };

    public void MarcarConcluido(int totalLinhas, int execucoesCriadas, int totalErros)
    {
        TotalLinhas = totalLinhas;
        ExecucoesCriadas = execucoesCriadas;
        TotalErros = totalErros;
        Status = totalErros > 0 ? StatusUpload.ConcluidoComErros : StatusUpload.Concluido;
        ProcessadoEm = DateTime.UtcNow;
    }

    public void MarcarErro(string mensagem)
    {
        Status = StatusUpload.Erro;
        MensagemErro = mensagem;
        ProcessadoEm = DateTime.UtcNow;
    }
}
```

### Entidade: ErroUpload

```csharp
public class ErroUpload
{
    public Guid Id { get; private set; }
    public Guid UploadId { get; private set; }
    public int Linha { get; private set; }
    public string Coluna { get; private set; }
    public string Mensagem { get; private set; }
    public DateTime CriadoEm { get; private set; }

    private ErroUpload() { }

    public static ErroUpload Criar(Guid uploadId, int linha, string coluna, string mensagem) => new()
    {
        Id = Guid.NewGuid(),
        UploadId = uploadId,
        Linha = linha,
        Coluna = coluna,
        Mensagem = mensagem,
        CriadoEm = DateTime.UtcNow,
    };
}
```

### Enum: StatusUpload

```csharp
public enum StatusUpload
{
    Processando,
    Concluido,
    ConcluidoComErros,
    Erro
}
```

### Interface: IMinioService

```csharp
public interface IMinioService
{
    Task<string> UploadAsync(string key, Stream stream, string contentType, CancellationToken ct);
    Task<Stream> DownloadAsync(string key, CancellationToken ct);
}
```

### Schema PostgreSQL (migration incremental)

```sql
CREATE TABLE identificacao."Uploads" (
    "Id"                UUID PRIMARY KEY,
    "CaptacaoId"        UUID NOT NULL REFERENCES identificacao."Captacoes"("Id") ON DELETE CASCADE,
    "NomeArquivo"       VARCHAR(255) NOT NULL,
    "MinioKey"          VARCHAR(500) NOT NULL,
    "Status"            VARCHAR(30) NOT NULL DEFAULT 'Processando',
    "TotalLinhas"       INTEGER,
    "ExecucoesCriadas"  INTEGER,
    "TotalErros"        INTEGER,
    "MensagemErro"      TEXT,
    "AnalistaId"        UUID NOT NULL,
    "CriadoEm"          TIMESTAMP WITH TIME ZONE NOT NULL,
    "ProcessadoEm"      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX ix_uploads_captacao ON identificacao."Uploads" ("CaptacaoId");
CREATE INDEX ix_uploads_status ON identificacao."Uploads" ("Status") WHERE "Status" = 'Processando';

CREATE TABLE identificacao."ErrosUpload" (
    "Id"          UUID PRIMARY KEY,
    "UploadId"    UUID NOT NULL REFERENCES identificacao."Uploads"("Id") ON DELETE CASCADE,
    "Linha"       INTEGER NOT NULL,
    "Coluna"      VARCHAR(50) NOT NULL,
    "Mensagem"    VARCHAR(500) NOT NULL,
    "CriadoEm"    TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX ix_erros_upload ON identificacao."ErrosUpload" ("UploadId");
```

### Pipeline de Processamento (CsvProcessorWorker)

```
┌─────────────────────┐
│ 1. Poll: Uploads     │
│    WHERE Status =    │
│    'Processando'     │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. Download CSV      │
│    do MinIO          │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Parse + Validar   │  → Erros por linha/coluna
│    linha a linha     │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Detectar dupl.    │  → Erro se mesmo ISRC + horários divergentes
│    + tipo_util div.  │  → Erro se mesmo ISRC + horário + tipo divergente
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 5. Agrupar           │  → mesmo ISRC + mesmo horário = quantidade++
│    linhas idênticas  │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Consultar         │  → CadastroHttpClient (reutiliza F02)
│    Cadastro em batch │  → IDENTIFICADA ou PENDENTE
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 7. Criar Execuções   │  → ExecucaoRepository (reutiliza F02)
│    em batch          │  → SaveChangesAsync por lote (ex: 100)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 8. Persistir Erros   │  → ErroUploadRepository
│    + Atualizar Upload│  → MarcarConcluido ou MarcarErro
└─────────────────────┘
```

### CsvParser — Lógica de parsing e validação

```csharp
public class CsvParser
{
    public CsvParseResult Parse(StreamReader reader, bool exigeClassificacao)
    {
        var linhas = new List<CsvLinha>();
        var erros = new List<ErroUploadDto>();
        var header = reader.ReadLine()?.Split(';');

        if (header == null || !ValidarHeader(header, out var headerErros))
            return CsvParseResult.ErroGlobal("Colunas obrigatórias ausentes");

        int numLinha = 0;
        while (!reader.EndOfStream)
        {
            numLinha++;
            var line = reader.ReadLine();
            var campos = line?.Split(';') ?? Array.Empty<string>();

            var linhaErros = ValidarLinha(numLinha, campos, exigeClassificacao);
            if (linhaErros.Any())
            {
                erros.AddRange(linhaErros);
                continue;
            }

            linhas.Add(MapearLinha(numLinha, campos));
        }

        // Detectar duplicatas
        var duplicataErros = DetectarDuplicatas(linhas);
        erros.AddRange(duplicataErros);

        // Remover linhas com duplicata
        var linhasValidas = linhas.Where(l => !duplicataErros.Any(e => e.Linha == l.NumeroLinha)).ToList();

        // Agrupar
        var agrupadas = Agrupar(linhasValidas);

        return new CsvParseResult(agrupadas, erros, numLinha);
    }

    private List<CsvLinhaAgrupada> Agrupar(List<CsvLinha> linhas)
    {
        return linhas
            .GroupBy(l => new { l.Isrc, l.Iswc, l.Inicio, l.Fim, l.TipoUtilizacao, l.TituloPrograma })
            .Select(g => new CsvLinhaAgrupada
            {
                Isrc = g.Key.Isrc,
                Iswc = g.Key.Iswc,
                Inicio = g.Key.Inicio,
                Fim = g.Key.Fim,
                TipoUtilizacao = g.Key.TipoUtilizacao,
                TituloPrograma = g.Key.TituloPrograma,
                Quantidade = g.Count(),
            })
            .ToList();
    }

    private List<ErroUploadDto> DetectarDuplicatas(List<CsvLinha> linhas)
    {
        var erros = new List<ErroUploadDto>();
        var vistos = new Dictionary<string, (int Linha, TimeOnly Inicio, TimeOnly Fim, string? TipoUtil)>();

        foreach (var linha in linhas)
        {
            var chave = linha.Isrc ?? linha.Iswc ?? "";
            if (string.IsNullOrEmpty(chave)) continue;

            if (vistos.TryGetValue(chave, out var anterior))
            {
                // Mesmo identificador
                if (anterior.Inicio != linha.Inicio || anterior.Fim != linha.Fim)
                {
                    // Horários divergentes
                    erros.Add(new(linha.NumeroLinha, "isrc",
                        $"ISRC {chave} já registrado com horário diferente (linha {anterior.Linha})"));
                }
                else if (anterior.TipoUtil != linha.TipoUtilizacao)
                {
                    // Mesmo horário, tipo divergente
                    erros.Add(new(linha.NumeroLinha, "tipo_utilizacao",
                        $"ISRC {chave} na linha {linha.NumeroLinha} tem tipo de utilização divergente da linha {anterior.Linha}"));
                    // Também marcar a linha anterior como erro
                    erros.Add(new(anterior.Linha, "tipo_utilizacao",
                        $"ISRC {chave} na linha {anterior.Linha} tem tipo de utilização divergente da linha {linha.NumeroLinha}"));
                }
                // Se tudo igual → será agrupado (não é erro)
            }
            else
            {
                vistos[chave] = (linha.NumeroLinha, linha.Inicio, linha.Fim, linha.TipoUtilizacao);
            }
        }

        return erros;
    }
}
```

### CsvProcessorWorker — Background Job

```csharp
public class CsvProcessorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CsvProcessorWorker> _logger;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var uploadRepo = scope.ServiceProvider.GetRequiredService<IUploadRepository>();
            var pendentes = await uploadRepo.ListarPendentesAsync(ct);

            foreach (var upload in pendentes)
            {
                try
                {
                    await ProcessarUploadAsync(scope.ServiceProvider, upload, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao processar upload {UploadId}", upload.Id);
                    upload.MarcarErro($"Erro interno: {ex.Message}");
                    await uploadRepo.SaveChangesAsync(ct);
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(5), ct); // Poll a cada 5s
        }
    }

    private async Task ProcessarUploadAsync(IServiceProvider sp, Upload upload, CancellationToken ct)
    {
        var minioService = sp.GetRequiredService<IMinioService>();
        var captacaoRepo = sp.GetRequiredService<ICaptacaoRepository>();
        var execucaoRepo = sp.GetRequiredService<IExecucaoRepository>();
        var erroRepo = sp.GetRequiredService<IErroUploadRepository>();
        var uploadRepo = sp.GetRequiredService<IUploadRepository>();
        var cadastroClient = sp.GetRequiredService<ICadastroHttpClient>();
        var parser = sp.GetRequiredService<CsvParser>();

        // Verificar captação ainda aberta
        var captacao = await captacaoRepo.GetByIdAsync(upload.CaptacaoId, ct);
        if (captacao == null || captacao.Status != StatusCaptacao.Aberta)
        {
            upload.MarcarErro("Captação não está mais aberta");
            await uploadRepo.SaveChangesAsync(ct);
            return;
        }

        // Download do CSV do MinIO
        using var stream = await minioService.DownloadAsync(upload.MinioKey, ct);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        // Parse + validação + agrupamento
        var result = parser.Parse(reader, captacao.Rubrica.ExigeClassificacao);

        if (result.IsErroGlobal)
        {
            upload.MarcarErro(result.MensagemErroGlobal!);
            await uploadRepo.SaveChangesAsync(ct);
            return;
        }

        // Persistir erros
        foreach (var erro in result.Erros)
        {
            var erroEntity = ErroUpload.Criar(upload.Id, erro.Linha, erro.Coluna, erro.Mensagem);
            await erroRepo.AddAsync(erroEntity, ct);
        }

        // Consultar Cadastro e criar execuções em batch
        int criadas = 0;
        foreach (var batch in result.LinhasAgrupadas.Chunk(100))
        {
            foreach (var linha in batch)
            {
                var (obraInfo, fonoInfo, status) = await ResolverCadastroAsync(
                    cadastroClient, linha.Isrc, linha.Iswc, ct);

                var execucao = Execucao.Criar(
                    upload.CaptacaoId, obraInfo?.Id ?? Guid.Empty, fonoInfo?.Id,
                    obraInfo?.Titulo ?? "", fonoInfo?.Isrc, obraInfo?.Iswc,
                    fonoInfo?.Interpretes ?? "", linha.Inicio, linha.Fim,
                    linha.Quantidade, ResolverTipoUtilizacaoId(linha.TipoUtilizacao),
                    linha.TituloPrograma, status);

                await execucaoRepo.AddAsync(execucao, ct);
                criadas++;
            }

            await execucaoRepo.SaveChangesAsync(ct); // Batch save a cada 100
        }

        upload.MarcarConcluido(result.TotalLinhas, criadas, result.Erros.Count);
        await uploadRepo.SaveChangesAsync(ct);
    }
}
```

### Mapeamento de Regras de Negócio

| Regra | Implementação |
|-------|---------------|
| RN-02 | CsvProcessorWorker → ISRC sem match = PENDENTE |
| RN-03 | CsvParser.Agrupar() — quantidade acumulada |
| RN-04 | CsvProcessorWorker verifica captação ABERTA antes de processar |
| RN-08 | UploadEndpoints extrai analistaId do JWT |
| RN-09 | CsvProcessorWorker consulta Cadastro via CadastroHttpClient |
| RN-12 | CsvParser.ValidarLinha() valida tipo_utilizacao com base em exigeClassificacao |

---

## Infraestrutura: MinIO

### Docker Compose (novo serviço)

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

### MinioService

```csharp
public class MinioService : IMinioService
{
    private readonly IMinioClient _client;
    private const string BucketName = "identificacao-uploads";

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
}
```

### MinIO Key Pattern

```
uploads/{captacaoId}/{uploadId}/{nomeArquivo}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Upload.cs` | Entity | Factory, MarcarConcluido, MarcarErro |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/ErroUpload.cs` | Entity | Factory |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusUpload.cs` | Enum | Processando, Concluido, ConcluidoComErros, Erro |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IUploadRepository.cs` | Interface | CRUD + ListarPendentes |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IErroUploadRepository.cs` | Interface | Add + ListarPorUpload |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IMinioService.cs` | Interface | Upload/Download |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/UploadConfiguration.cs` | Config | FK, índices, conversão de status |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/ErroUploadConfiguration.cs` | Config | FK cascade, índice |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/UploadRepository.cs` | Repository | CRUD + ListarPendentesAsync |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ErroUploadRepository.cs` | Repository | Add + Listar paginado |
| `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/MinioService.cs` | Service | Wrapper do MinIO client |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvParser.cs` | Service | Parse, validação, agrupamento, duplicatas |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvProcessorWorker.cs` | Worker | Background job de processamento |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Commands/CriarUploadCommand.cs` | Command | Upload do CSV + validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Commands/CriarUploadCommandHandler.cs` | Handler | Salva no MinIO, cria registro Upload |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarUploadsQuery.cs` | Query | Lista paginada |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarUploadsQueryHandler.cs` | Handler | |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/GetUploadByIdQuery.cs` | Query | Detalhe |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/GetUploadByIdQueryHandler.cs` | Handler | |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarErrosUploadQuery.cs` | Query | Erros paginados |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarErrosUploadQueryHandler.cs` | Handler | |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Responses/UploadResponse.cs` | DTO | |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Responses/ErroUploadResponse.cs` | DTO | |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/UploadEndpoints.cs` | Endpoint | POST multipart, GET list/detail/erros |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CsvParserTests.cs` | Teste | Parse, validação, agrupamento, duplicatas |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarUploadCommandHandlerTests.cs` | Teste | Upload, validações |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/UploadTests.cs` | Teste | Factory, transições de estado |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` | Adicionar DbSets de Upload e ErroUpload |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Registrar MinIO client, repos, CsvParser, CsvProcessorWorker, mapear endpoints |
| `services/identificacao-api/.env.example` | Adicionar vars MinIO (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) |
| `docker-compose.dev.yml` | Adicionar serviço mcad-minio + volume |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Execucao.cs` | Criar execuções no worker |
| `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/CadastroHttpClient.cs` | Reutilizar no worker |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` | Persistir execuções no worker |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` | Padrão de BackgroundService |

---

## Abordagem de Testes

### CsvParserTests (mais importante)

| Cenário | Tipo |
|---------|------|
| Parse CSV válido com 3 linhas → 3 execuções | Unit |
| Parse com header inválido → erro global | Unit |
| Linha sem ISRC nem ISWC → erro na linha | Unit |
| Linha com início > fim → erro na linha | Unit |
| Rubrica audiovisual sem tipo_utilizacao → erro | Unit |
| 2 linhas idênticas → agrupadas em quantidade=2 | Unit |
| Mesmo ISRC + horários divergentes → erro na segunda | Unit |
| Mesmo ISRC + mesmo horário + tipo divergente → erro em ambas | Unit |
| CSV com 0 linhas válidas → todos erros | Unit |
| Rubrica não-audiovisual sem tipo_utilizacao → aceita | Unit |

### UploadTests (domain)

| Cenário | Tipo |
|---------|------|
| Criar upload → status PROCESSANDO | Unit |
| MarcarConcluido sem erros → CONCLUIDO | Unit |
| MarcarConcluido com erros → CONCLUIDO_COM_ERROS | Unit |
| MarcarErro → ERRO com mensagem | Unit |

---

## Sequenciamento de Desenvolvimento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Docker Compose — MinIO | Nenhuma |
| 2 | Domain — Upload, ErroUpload, StatusUpload, interfaces | Nenhuma |
| 3 | Infra — DbContext, configurations, migration | Etapa 2 |
| 4 | Infra — MinioService, UploadRepository, ErroUploadRepository | Etapa 3 |
| 5 | Application — CsvParser (lógica pura, testável isoladamente) | Nenhuma (paralelo) |
| 6 | Application — Commands + Queries + Handlers | Etapa 4 + 5 |
| 7 | Application — CsvProcessorWorker | Etapa 5 + 6 |
| 8 | API — UploadEndpoints, Program.cs | Etapa 6 + 7 |
| 9 | Testes | Etapa 5 (CsvParser), 6 (handlers), 2 (domain) |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Telas:
1. Seção "Uploads" na CaptacaoDetailPage (tabela com status, contadores, botão importar)
2. Detalhe de upload com relatório de erros expandido
3. Estado "Processando" com spinner/polling

---

*TechSpec gerada com a skill `flow-techspec-creator`.*
