---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>engine/application/identidade</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: F1 Backend — ListarAnalistasQuery + endpoint GET /analistas

## Visão Geral

Implementa o backend que alimenta a combo do filtro de Responsável: um novo endpoint `GET /api/v1/analistas` que lista usuários ativos da projeção `usuarios_identidade` como candidatos a responsável, retornando `AnalistaResumoResponse { Id, Nome }` onde `Id` já é o `Guid` casável com `Captacao.AnalistaResponsavelId`.

**Espelha exatamente o padrão `ListarRubricas`** (query + handler + endpoint), que é o exemplo canônico do projeto. O handler/query são auto-registrados pelo Scrutor; apenas o endpoint e a permissão precisam de registro explícito.

## Requisitos

- `ListarAnalistasQuery` (sem parâmetros) → retorna `IEnumerable<AnalistaResumoResponse>`.
- Handler chama `IUsuarioIdentidadeRepository.ListarAtivosAsync`, mapeia para `AnalistaResumoResponse` com `Id = AnalistaIdentificador.FromSubject(u.LogtoUserId)` e `Nome = u.NomeExibicao`.
- Resultado ordenado por `Nome`.
- Endpoint `GET /api/v1/analistas` no mesmo pipeline autenticado dos demais (padrão `/api/v1/...`), com permissão apropriada.
- Reutilizar o `AnalistaResumoResponse` já existente em `CaptacaoResponse.cs` — **não** criar DTO novo.
- Lista vazia deve retornar `[]` (200), sem erro.

## Subtarefas

- [ ] 3.1 Criar `2-Application/Identificacao.Application/Identidade/Queries/ListarAnalistasQuery.cs`:
  ```csharp
  public record ListarAnalistasQuery() : IQuery<IEnumerable<AnalistaResumoResponse>>;
  ```
- [ ] 3.2 Criar `2-Application/.../Identidade/Queries/ListarAnalistasQueryHandler.cs`:
  - injeta `IUsuarioIdentidadeRepository`;
  - `var ativos = await _repo.ListarAtivosAsync(ct);`
  - projeta `ativos.Select(u => new AnalistaResumoResponse(AnalistaIdentificador.FromSubject(u.LogtoUserId), u.NomeExibicao))`;
  - ordena por `Nome` (`OrderBy(a => a.Nome, StringComparer.OrdinalIgnoreCase)`).
- [ ] 3.3 Adicionar permissão em `IdentificacaoPermissions.cs` (seguir o padrão `identificacao:default:analista:listar` — confirmar nomenclatura do arquivo).
- [ ] 3.4 Criar `1-Services/Identificacao.API/Endpoints/AnalistaEndpoints.cs` com `MapAnalistaEndpoints(this IEndpointRouteBuilder)`:
  ```csharp
  var group = app.MapGroup("/api/v1/analistas").WithTags("Analistas");
  group.MapGet("/", async (IDispatcher dispatcher, CancellationToken ct) =>
  {
      var result = await dispatcher.QueryAsync(new ListarAnalistasQuery(), ct);
      return Results.Ok(result);
  })
  .RequireIdentificacaoPermission(IdentificacaoPermissions.AnalistaListar);
  ```
- [ ] 3.5 Registrar `app.MapAnalistaEndpoints();` no pipeline de endpoints (onde `MapCaptacaoEndpoints`/`MapRubricaEndpoints` são chamados).
- [ ] 3.6 Testes unitários do handler (mock do repositório):
  - retorna apenas ativos (exclui suspenso e excluído);
  - ordenado por nome;
  - `Id` calculado via `AnalistaIdentificador.FromSubject`;
  - aplica fallback de `NomeExibicao`;
  - lista vazia → `[]`.
- [ ] 3.7 `dotnet build` verde; `dotnet test` nos unitários do handler.

## Sequenciamento

- Bloqueado por: 1.0 (`AnalistaIdentificador`), 2.0 (repositório).
- Desbloqueia: 4.0 (frontend consome `GET /analistas`).
- Paralelizável: **Sim** com 5.0 e 6.0 (queries/commands/endpoint distintos). Não paralelizável com 4.0 (frontend depende deste endpoint).

## Detalhes de Implementação

**Auto-registro Scrutor:** handlers que implementam `IQueryHandler<,>` no assembly `Identificacao.Application` são registrados automaticamente (bloco `Scan(...).AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)))` em `Program.cs`). **Não** adicionar DI manual do handler.

**Permissão:** seguir `RequireIdentificacaoPermission(...)` já usado por `RubricaEndpoints`/`CaptacaoEndpoints`. Como a combo expõe nomes de analistas apenas a usuários já autorizados na tela de Captações, a permissão pode reutilizar `CaptacaoListar` ou criar uma dedicada `AnalistaListar` (preferível para granularidade). Confirmar o enum/costante em `IdentificacaoPermissions.cs`.

**Contrato de saída** (`AnalistaResumoResponse`, já existe):
```csharp
public record AnalistaResumoResponse(Guid Id, string Nome);
```
O `Id` é o mesmo `Guid` que o filtro `?analistaResponsavelId=` já compara, então **nenhuma mudança no GET /captacoes**.

## Critérios de Sucesso

- `GET /api/v1/analistas` retorna apenas analistas ativos, ordenados por nome, com `Id` casável com captações existentes.
- Endpoint autenticado e protegido por permissão.
- Reutiliza `AnalistaResumoResponse` (sem DTO duplicado).
- Lista vazia retorna `200 []` sem quebrar.
- Handler é auto-registrado; unitários do mapeamento/filtro/ordenação passando.
