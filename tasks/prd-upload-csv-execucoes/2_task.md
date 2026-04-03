---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Domain Layer (Upload, ErroUpload, Interfaces)

## Visão Geral

Criar entidades Upload (com state machine) e ErroUpload, enum StatusUpload, e interfaces de repositório.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Upload.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/ErroUpload.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusUpload.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IUploadRepository.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IErroUploadRepository.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/UploadTests.cs`
- **Referência:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` (padrão entidade)

## Subtarefas

- [ ] 2.1 Criar enum `StatusUpload` (Processando, Concluido, ConcluidoComErros, Erro)
- [ ] 2.2 Criar entidade `Upload` com factory `Criar()`, métodos `MarcarConcluido()`, `MarcarErro()`
- [ ] 2.3 Criar entidade `ErroUpload` com factory `Criar()`
- [ ] 2.4 Criar interfaces `IUploadRepository` (CRUD + ListarPendentesAsync), `IErroUploadRepository` (Add + ListarPorUploadAsync)
- [ ] 2.5 Testes unitários `UploadTests.cs`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 3.0
- Paralelizável: Sim (paralelo com 1.0, 4.0, 7.0)

## Detalhes de Implementação

**Upload.cs:** Conforme TechSpec — factory `Criar()`, `MarcarConcluido(totalLinhas, criadas, erros)` que define status baseado em erros > 0, `MarcarErro(mensagem)`.

**IUploadRepository:**
```csharp
public interface IUploadRepository
{
    Task<Upload?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct);
    Task<(IEnumerable<Upload> Items, int Total)> ListarAsync(Guid captacaoId, int page, int size, CancellationToken ct);
    Task<IEnumerable<Upload>> ListarPendentesAsync(CancellationToken ct);
    Task AddAsync(Upload upload, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
```

**Testes:**
1. `Criar_RetornaStatusProcessando`
2. `MarcarConcluido_SemErros_StatusConcluido`
3. `MarcarConcluido_ComErros_StatusConcluidoComErros`
4. `MarcarErro_StatusErroComMensagem`

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~UploadTests"`
- [ ] 4 cenários cobertos
