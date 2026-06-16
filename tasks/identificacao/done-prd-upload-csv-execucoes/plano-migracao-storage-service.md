# Plano de Migração: Upload CSV — MinIO → Storage Service

**PRD:** `tasks/identificacao/done-prd-upload-csv-execucoes/prd.md`  
**TechSpec original:** `tasks/identificacao/done-prd-upload-csv-execucoes/techspec.md`  
**Data:** 2026-06-15  
**Status:** Em execução

---

## 1. Motivação

O QA Report (`qa-evidence/qa_report_consolidated.md`) revelou que o endpoint `POST /uploads` retorna HTTP 500 em produção. A causa raiz é a indisponibilidade do MinIO/R2 configurado diretamente via AWS S3 SDK.

O serviço `cadastro-api` já utiliza com sucesso o **storage-service** (`storage.tasso.dev.br`) — um serviço gerenciado de storage com scan de antivírus (ClamAV) e autenticação M2M via Logto. Esta migração padroniza o `identificacao-api` no mesmo padrão.

### Arquitetura atual

```
identificacao-api ──(AWS S3 SDK)──► MinIO (dev) / Cloudflare R2 (prod)
```
- Credenciais AWS em env vars
- Bucket manual, sem scan de vírus
- Usa reflection para setar `MinioKey` após upload

### Arquitetura alvo

```
identificacao-api ──(HTTP + M2M JWT)──► storage.tasso.dev.br ──► Cloudflare R2 + ClamAV
```
- Autenticação M2M via Logto
- Scan automático de vírus (ClamAV)
- Sem dependência de AWS SDK
- Padrão idêntico ao `cadastro-api`

---

## 2. Inventário de Mudanças

### 2.1 Arquivos a CRIAR

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `Identificacao.Application/Storage/IStorageServiceClient.cs` | Interface no Application layer |
| 2 | `Identificacao.Infra/Storage/StorageServiceClient.cs` | Implementação HTTP do cliente storage |
| 3 | `Identificacao.Infra/Storage/LogToM2MTokenService.cs` | Singleton de token M2M |
| 4 | `Identificacao.Infra/Storage/StorageOptions.cs` | Options pattern |
| 5 | `Identificacao.Infra/Storage/StorageDtos.cs` | DTOs de request/response |

### 2.2 Arquivos a MODIFICAR

| # | Arquivo | Mudança |
|---|---------|---------|
| 6 | `Domain/Entities/Upload.cs` | Renomear `MinioKey` → `StorageFileId` |
| 7 | `Infra/Data/Configurations/UploadConfiguration.cs` | Renomear coluna mapeada |
| 8 | `Application/Uploads/Commands/CriarUploadCommandHandler.cs` | `IMinioService` → `IStorageServiceClient`, remover reflection |
| 9 | `Application/Uploads/Services/CsvProcessorWorker.cs` | Polling de scan + download via storage-service |
| 10 | `API/Program.cs` | Remover AWS SDK; adicionar DI do storage-service |

### 2.3 Arquivos a REMOVER

| # | Arquivo |
|---|---------|
| 11 | `Infra/ExternalServices/MinioService.cs` |
| 12 | `Domain/Interfaces/IMinioService.cs` |

### 2.4 Database

| # | Descrição |
|---|-----------|
| 13 | Nova migration: `RenameColumn` `MinioKey` → `StorageFileId` na tabela `Uploads` |

### 2.5 Configuração

| # | Descrição |
|---|-----------|
| 14 | `.env.example`: remover vars MinIO/R2; adicionar `STORAGE_SERVICE_*` |
| 15 | `docker-compose.dev.yml`: remover serviço `mcad-minio` |
| 16 | `docker-stack.yml`: atualizar env vars do identificacao-api |

### 2.6 Testes

| # | Arquivo | Mudança |
|---|---------|---------|
| 17 | `Tests/Application/CriarUploadCommandHandlerTests.cs` | Mock `IMinioService` → `IStorageServiceClient` |
| 18 | `Tests/Domain/UploadTests.cs` | `MinioKey` → `StorageFileId` nos asserts |

---

## 3. Detalhamento Técnico

### 3.1 Worker — Polling de Scan

O `CsvProcessorWorker` verifica o status de scan antes de baixar:

```
Para cada upload com Status = Processando:
  1. Chama storageService.GetMetadataAsync(upload.StorageFileId)
  2. Se status == "pending_scan" → skip (próxima iteração em 5s)
  3. Se status == "infected"    → upload.MarcarErro("Arquivo infectado...")
  4. Se status == "clean"       → download + processamento CSV
```

Estratégia **não-bloqueante**: se o arquivo ainda está em scan, o worker simplesmente pula e tenta de novo em 5 segundos.

### 3.2 Handler de Upload

O `CriarUploadCommandHandler` passa a usar o storage-service:

```csharp
// ANTES (MinIO)
var upload = Upload.Criar(cmd.CaptacaoId, cmd.NomeArquivo, "", cmd.AnalistaId);
var minioKey = $"uploads/{cmd.CaptacaoId}/{upload.Id}/{cmd.NomeArquivo}";
await _minioService.UploadAsync(minioKey, cmd.ArquivoStream, "text/csv", ct);
typeof(Upload).GetProperty("MinioKey")?.SetValue(upload, minioKey); // reflection

// DEPOIS (Storage Service)
var result = await _storageService.UploadAsync(cmd.ArquivoStream, "text/csv", cmd.NomeArquivo, ct);
var upload = Upload.Criar(cmd.CaptacaoId, cmd.NomeArquivo, result.Id, cmd.AnalistaId);
// Sem reflection — StorageFileId é passado diretamente no factory
```

### 3.3 Interface do Storage Client

```csharp
public interface IStorageServiceClient
{
    Task<StorageFileResult> UploadAsync(Stream content, string contentType, string fileName, CancellationToken ct);
    Task<StorageFileResult> GetMetadataAsync(string storageFileId, CancellationToken ct);
    Task<Stream> DownloadAsync(string storageFileId, CancellationToken ct);
}
```

### 3.4 Variáveis de Ambiente

**Remover:**
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `R2_S3_API`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_TOKEN_VALUE`

**Adicionar (mesmos valores do cadastro-api):**
- `STORAGE_SERVICE_URL=https://storage.tasso.dev.br`
- `STORAGE_LOGTO_ISSUER=https://9lcinu.logto.app/oidc`
- `STORAGE_LOGTO_CLIENT_ID=<m2m-client-id>`
- `STORAGE_LOGTO_CLIENT_SECRET=<m2m-client-secret>`

---

## 4. Sequência de Implementação

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Criar `IStorageServiceClient` + DTOs (Application) | Nenhuma |
| 2 | Criar `StorageOptions`, `StorageDtos`, `LogToM2MTokenService` (Infra) | Nenhuma |
| 3 | Criar `StorageServiceClient` (Infra) | 1, 2 |
| 4 | Modificar `Upload.cs` (Domain) | Nenhuma |
| 5 | Modificar `UploadConfiguration.cs` + criar migration | 4 |
| 6 | Modificar `CriarUploadCommandHandler.cs` | 1, 3, 4 |
| 7 | Modificar `CsvProcessorWorker.cs` | 1, 3, 4 |
| 8 | Atualizar `Program.cs` (DI storage-service, remover AWS SDK) | 3 |
| 9 | Remover `MinioService.cs` + `IMinioService.cs` | 8 |
| 10 | Atualizar testes unitários | 6, 7 |
| 11 | Atualizar `.env.example` + docker-compose + docker-stack | Nenhuma |
| 12 | Verificar build + testes | Todas |

---

## 5. Riscos

| Risco | Mitigação |
|-------|-----------|
| M2M client não provisionado no Logto para identificacao-api | Reutilizar mesmo client M2M do cadastro-api (mesmo tenant, mesmos scopes `storage:read storage:write`) |
| Arquivo infectado por vírus (raro em CSV) | Worker detecta `infected` e marca upload como ERRO |
| Scan demorar >60s | Timeout no worker: 12 iterações sem `clean` → marca ERRO |
| Storage service indisponível | Polly retry (1 tentativa); upload retorna 503 |
| Rollback | Migration `Down()` reverte rename; código antigo preservado no git |

---

## 6. Impacto

| Aspecto | Impacto |
|---------|---------|
| API Contract | Nenhum |
| Frontend | Nenhum |
| Database | Migration de rename (segura, instantânea no PostgreSQL) |
| Breaking change | Nenhum |
| Deploy | Remover MinIO do compose, adicionar 4 env vars |
