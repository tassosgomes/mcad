---
status: pending
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 5.0: Application — Commands CRUD (Criar, Atualizar, Excluir) + Validators

## Visão Geral

Criar os 3 commands CRUD padrão. O `AtualizarObraCommandHandler` tem lógica especial: se a obra é LIBERADA e o título muda, lança `DepuracaoNecessariaException` (409 com code) em vez de atualizar — forçando o frontend a chamar `/depurar`.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Obras/Commands/CriarObraCommand.cs` + Handler + Validator
  - `2-Application/.../Obras/Commands/AtualizarObraCommand.cs` + Handler + Validator
  - `2-Application/.../Obras/Commands/ExcluirObraCommand.cs` + Handler
- **Skills:** `dotnet-architecture` — CQRS Commands; `dotnet-code-quality` — FluentValidation

## Subtarefas

- [ ] 5.1 `CriarObraCommand` + Validator (titulo obrigatório, tipo válido) + Handler (ObraMusical.Criar → persist)
- [ ] 5.2 `AtualizarObraCommand` + Validator + Handler: se PENDENTE → atualiza livre; se LIBERADO e título diferente → lança `DepuracaoNecessariaException`; se DEPURADA/DP → lança DomainException; se LIBERADO e apenas subtitulo/tipo/genero → atualiza sem depurar
- [ ] 5.3 `ExcluirObraCommand` + Handler: verifica PossuiVinculosAsync, verifica status != DEPURADA, exclui
- [ ] 5.4 Verificar build: `dotnet build`

## Detalhes de Implementação

### AtualizarObraCommandHandler — lógica central
```csharp
var obra = await _repo.GetByIdAsync(cmd.Id, ct) ?? throw new NotFoundException(...);

if (obra.RequerDepuracao(cmd.Titulo))
    throw new DepuracaoNecessariaException("Alterar o título requer depuração");

obra.Atualizar(cmd.Titulo, cmd.Subtitulo, Enum.Parse<TipoObra>(cmd.Tipo), cmd.Genero);
await _repo.SaveChangesAsync(ct);
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Criar obra retorna status PENDENTE
- [ ] Atualizar obra PENDENTE com título diferente → sucesso
- [ ] Atualizar obra LIBERADA com título diferente → DepuracaoNecessariaException
- [ ] Atualizar obra LIBERADA com apenas gênero diferente → sucesso (sem depuração)
- [ ] Excluir obra DEPURADA → ConflictException
