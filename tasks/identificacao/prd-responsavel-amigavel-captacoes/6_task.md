---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0"]
---

<task_context>
<domain>engine/application/captacoes</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: F3 — Backfill de responsáveis "Desconhecido"

## Visão Geral

Corrige retroativamente as captações históricas cujo `AnalistaResponsavelNome == "Desconhecido"`. Um novo endpoint de manutenção **admin-only** `POST /api/v1/captacoes/manutencao/reprocessar-responsaveis` percorre essas captações e, quando o `AnalistaResponsavelId` casa com algum usuário da projeção, atualiza o nome gravado. É **idempotente** (só toca linhas com nome "Desconhecido") e usa `ListarTodosAsync` (inclui suspensos) para recuperar histórico de responsáveis hoje inativos.

## Requisitos

- Novo método de domínio em `Captacao`: `ReatribuirNomeResponsavel(string nome)` — única forma de alterar `AnalistaResponsavelNome` (mantém o `Id` imutável).
- Novo command `ReprocessarResponsaveisDesconhecidosCommand` + handler: carrega captações com nome "Desconhecido"; monta dicionário `Guid → NomeExibicao` a partir de `ListarTodosAsync` via `AnalistaIdentificador.FromSubject(logtoUserId)`; corrige as casáveis; retorna `{ totalAnalisadas, totalCorrigidas }`.
- Novo endpoint `POST /api/v1/captacoes/manutencao/reprocessar-responsaveis` **admin-only** (autorização específica).
- Idempotência garantida (2ª execução → 0 corrigidas).
- Captações sem correspondência permanecem "Desconhecido", sem erro (RF-14).
- Log estruturado (Information) com contagens; Warning amostrado por ID sem correspondência.

## Subtarefas

- [ ] 6.1 Em `Captacao.cs` (entidade), adicionar:
  ```csharp
  public void ReatribuirNomeResponsavel(string nome)
  {
      AnalistaResponsavelNome = nome;
      AtualizadoEm = DateTime.UtcNow;
  }
  ```
  (manter `AnalistaResponsavelId` imutável; apenas o backfill usa este método).
- [ ] 6.2 Adicionar ao repositório de captações (`ICaptacaoRepository`/`CaptacaoRepository`) um método para listar por nome de responsável:
  ```csharp
  Task<IReadOnlyList<Captacao>> ListarPorNomeResponsavelAsync(string nome, CancellationToken ct);
  ```
  Implementação `AsNoTracking()` **false** (precisa de tracking para update) ou recarregar/tracking manual — confirmar padrão de update do projeto. Filtro `Where(c => c.AnalistaResponsavelNome == nome)`.
- [ ] 6.3 Criar `2-Application/.../Captacoes/Commands/ReprocessarResponsaveisDesconhecidosCommand.cs`:
  ```csharp
  public record ReprocessarResponsaveisDesconhecidosCommand() : ICommand<ReprocessarResponsaveisResult>;
  public record ReprocessarResponsaveisResult(int TotalAnalisadas, int TotalCorrigidas);
  ```
- [ ] 6.4 Handler `ReprocessarResponsaveisDesconhecidosCommandHandler`:
  - injeta `ICaptacaoRepository` + `IUsuarioIdentidadeRepository` (+ logger);
  - `var captações = await _captacaoRepo.ListarPorNomeResponsavelAsync("Desconhecido", ct);`
  - `var usuarios = await _usuarioRepo.ListarTodosAsync(ct);` → dicionário `Guid → NomeExibicao` via `AnalistaIdentificador.FromSubject(u.LogtoUserId)`;
  - para cada captação cujo `AnalistaResponsavelId` está no dicionário: `captacao.ReatribuirNomeResponsavel(dic[id])`; contar;
  - `await _captacaoRepo.UnitOfWork.SaveChangesAsync(ct)` (ou o padrão de SaveChanges do projeto);
  - log Information com `totalAnalisadas`/`totalCorrigidas`; Warning amostrado para IDs sem correspondência;
  - retorna `ReprocessarResponsaveisResult(captações.Count, corrigidas)`.
- [ ] 6.5 Definir autorização admin: adicionar permissão/policy (ex.: `IdentificacaoPermissions.CaptacaoManutencao` ou policy de role admin) e o `RequireAuthorization` correspondente. Confirmar como o projeto modela papéis administrativos (ver `IdentificacaoPermissions.cs` e o toggle `AUTH_ENABLED`).
- [ ] 6.6 Criar `1-Services/.../Endpoints/CaptacaoEndpoints.cs` (ou `ManutencaoEndpoints.cs`):
  ```csharp
  group.MapPost("/manutencao/reprocessar-responsaveis", async (IDispatcher dispatcher, CancellationToken ct) =>
  {
      var result = await dispatcher.SendAsync(new ReprocessarResponsaveisDesconhecidosCommand(), ct);
      return Results.Ok(result);
  })
  .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoManutencao); // admin-only
  ```
- [ ] 6.7 Testes unitários do handler (mocks):
  - corrige apenas "Desconhecido" cujo ID casa com a projeção;
  - ignora (deixa "Desconhecido") quando não há correspondência — sem exception;
  - **idempotência**: 2ª execução com mesma massa → `TotalCorrigidas == 0`;
  - resolve responsável **suspenso** (presente em `ListarTodosAsync`).
- [ ] 6.8 `dotnet build` verde; `dotnet test` (unitários) verde.

## Sequenciamento

- Bloqueado por: 1.0 (`AnalistaIdentificador`), 2.0 (`IUsuarioIdentidadeRepository.ListarTodosAsync`).
- Desbloqueia: 7.0 (teste de integração do backfill + 403).
- Paralelizável: **Sim** com 3.0 e 5.0. Único cuidado: a entidade `Captacao` (adiciona um método); 5.0 também lê `Captacao` mas só via `Criar` — risco de conflito baixo (merge trivial).

## Detalhes de Implementação

**Casamento de ID:** o dicionário é `Guid → nome`, onde a chave é `AnalistaIdentificador.FromSubject(u.LogtoUserId)`. Assim o `Captacao.AnalistaResponsavelId` (já um Guid) casa diretamente — consistente com combo (F1) e cadastro (F2).

**Por que `ListarTodosAsync` (com suspensos)?** Para recuperar histórico de responsáveis que foram suspensos depois de criar captações (RF: "resolve responsável suspenso"). A combo (F1) usa só `ListarAtivosAsync`, mas o backfill precisa do universo completo.

**Idempotência:** o filtro inicial é `AnalistaResponsavelNome == "Desconhecido"`. Após a primeira execução, as casáveis mudam de nome, então a segunda execução não as reencontra → `TotalCorrigidas == 0`. As não-casáveis permanecem "Desconhecido" e são reanalisadas (esperado, RF-14), mas não alteradas.

**Gatilho:** endpoint sob demanda (decisão do usuário) — **não** tarefa agendada. Controlável, seguro com múltiplas réplicas (idempotente).

**Observabilidade:** `logger.LogInformation("Backfill concluído: {Analisadas} analisadas, {Corrigidas} corrigidas", ...)`. `LogWarning` amostrado (ex.: a cada N) para captações com ID sem correspondência na projeção.

## Critérios de Sucesso

- `POST .../manutencao/reprocessar-responsaveis` corrige captações "Desconhecido" casáveis e retorna `{ totalAnalisadas, totalCorrigidas }`.
- Idempotente: reexecução → 0 corrigidas (entre as já corrigidas).
- Não casáveis permanecem "Desconhecido" sem erro.
- Resolve responsáveis suspensos (histórico).
- Endpoint exige autorização admin (403 sem o papel — validado em 7.0).
- `Captacao.AnalistaResponsavelId` nunca é alterado pelo backfill.
- Build e unitários verdes.
