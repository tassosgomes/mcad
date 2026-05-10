---
status: completed
parallelizable: false
blocked_by: [3.0, 4.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Backend — Application Layer (Commands, Queries, Handlers)

## Relacionada aos Requisitos

- RF-01 — CriarUploadCommandHandler (salvar no MinIO, criar registro)
- RF-07 — ListarUploadsQueryHandler
- RF-08 — ListarErrosUploadQueryHandler

## Visão Geral

Implementar o command de upload (salva arquivo no MinIO, cria registro com status PROCESSANDO), queries de listagem de uploads e erros, e DTOs de response.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Commands/CriarUploadCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Commands/CriarUploadCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarUploadsQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarUploadsQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/GetUploadByIdQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/GetUploadByIdQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarErrosUploadQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Queries/ListarErrosUploadQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Responses/UploadResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Responses/ErroUploadResponse.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarUploadCommandHandlerTests.cs`

## Subtarefas

- [x] 5.1 Criar `UploadResponse` e `ErroUploadResponse` (DTOs)
- [x] 5.2 Criar `CriarUploadCommand` + handler — valida captação ABERTA + dono, valida extensão .csv, salva no MinIO, cria registro Upload
- [x] 5.3 Criar `ListarUploadsQuery` + handler — paginado, ordenado por CriadoEm DESC
- [x] 5.4 Criar `GetUploadByIdQuery` + handler — para polling
- [x] 5.5 Criar `ListarErrosUploadQuery` + handler — paginado
- [x] 5.6 Testes `CriarUploadCommandHandlerTests`

## Sequenciamento

- Bloqueado por: 3.0 (repos), 4.0 (CsvParser referência nos DTOs)
- Desbloqueia: 6.0
- Paralelizável: Não

## Detalhes de Implementação

**CriarUploadCommand:**
```csharp
public record CriarUploadCommand(
    Guid CaptacaoId,
    string NomeArquivo,
    Stream ArquivoStream,
    Guid AnalistaId
) : ICommand<UploadResponse>;
```

**CriarUploadCommandHandler:**
```csharp
public async Task<UploadResponse> HandleAsync(CriarUploadCommand cmd, CancellationToken ct)
{
    // Validar extensão
    if (!cmd.NomeArquivo.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        throw new ValidationException("Formato inválido. Apenas arquivos .csv são aceitos");

    // Validar captação
    var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", cmd.CaptacaoId);
    captacao.ValidarAberta();
    captacao.ValidarPropriedade(cmd.AnalistaId);

    // Validar arquivo não vazio
    if (cmd.ArquivoStream.Length == 0)
        throw new ValidationException("Arquivo vazio ou sem cabeçalho válido");

    // Upload para MinIO
    var upload = Upload.Criar(cmd.CaptacaoId, cmd.NomeArquivo, "", cmd.AnalistaId);
    var minioKey = $"uploads/{cmd.CaptacaoId}/{upload.Id}/{cmd.NomeArquivo}";
    await _minioService.UploadAsync(minioKey, cmd.ArquivoStream, "text/csv", ct);

    // Salvar registro
    // (set MinioKey via reflection ou método no entity)
    await _uploadRepo.AddAsync(upload, ct);
    await _uploadRepo.SaveChangesAsync(ct);

    return MapToResponse(upload);
}
```

**UploadResponse:**
```csharp
public record UploadResponse(
    Guid Id, Guid CaptacaoId, string NomeArquivo,
    string Status, int? TotalLinhas, int? ExecucoesCriadas,
    int? TotalErros, string? MensagemErro,
    DateTime CriadoEm, DateTime? ProcessadoEm);
```

**Testes:**
1. `Handle_CsvValido_CriaUploadProcessando`
2. `Handle_ArquivoNaoCsv_LancaValidation`
3. `Handle_ArquivoVazio_LancaValidation`
4. `Handle_CaptacaoFechada_LancaDomainException`
5. `Handle_OutroAnalista_LancaForbidden`

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~CriarUploadCommandHandlerTests"`
- [x] 5 cenários cobertos
