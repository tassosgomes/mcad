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
<unblocks>""</unblocks>
</task_context>

# Tarefa 5.0: F2 — Resolução do nome do responsável no cadastro

## Visão Geral

Hoje o nome do responsável de uma captação vem direto do claim do JWT (`name`/`username`, com fallback `"Desconhecido"`), ignorando a projeção `usuarios_identidade`. Quando o token não traz o nome, a captação fica "Desconhecido" mesmo o autor sendo conhecido. Esta tarefa faz o handler do `CriarCaptacaoCommand` **resolver o nome pela projeção** (busca por `subject`), usando o claim como fonte secundária e `"Desconhecido"` apenas como último recurso real.

O responsável continua sendo **automaticamente o usuário logado** (sem campo no formulário) — não há mudança de contrato HTTP do `POST /captacoes`.

## Requisitos

- `UserContextExtensions`: adicionar `GetAnalistaSubject()` (retorna `sub`) e mudar `GetAnalistaNome()` → `GetAnalistaNomeClaim()` retornando `string?` (remover o default `"Desconhecido"` daqui).
- `CriarCaptacaoCommand`: adicionar `string AnalistaSubject`; trocar `string AnalistaNome` por `string? AnalistaNomeClaim`.
- Handler resolve: `nome = (await repo.BuscarPorSubjectAsync(subject))?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido"`.
- Endpoint `POST /captacoes` monta o command com `AnalistaId`, `AnalistaSubject`, `AnalistaNomeClaim`.
- `"Desconhecido"` passa a ser emitido **apenas** quando nem a projeção nem o claim fornecem nome.
- Build verde o tempo todo: atualizar todos os call sites afetados pela mudança de assinatura.

## Subtarefas

- [ ] 5.1 Em `UserContextExtensions.cs`:
  - adicionar `GetAnalistaSubject(this ClaimsPrincipal user)` → `user.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException("Usuário ausente no token");`
  - renomear `GetAnalistaNome` → `GetAnalistaNomeClaim` retornando `string?` (sem `?? "Desconhecido"`): `name` ?? `username` ?? `null`.
- [ ] 5.2 Atualizar `CriarCaptacaoCommand` (record) — novo shape:
  ```csharp
  public record CriarCaptacaoCommand(
      Guid RubricaId,
      DateOnly Periodo,
      string UsuarioDeMusica,
      Guid AnalistaId,
      string AnalistaSubject,
      string? AnalistaNomeClaim
  ) : ICommand<CaptacaoResponse>;
  ```
  Ajustar `CriarCaptacaoCommandValidator`: validar `AnalistaSubject` (`NotEmpty()`); `AnalistaNomeClaim` **sem** `NotEmpty` (pode ser nulo).
- [ ] 5.3 Em `CriarCaptacaoCommandHandler`:
  - injetar `IUsuarioIdentidadeRepository` (novo ctor param);
  - antes de `Captacao.Criar`, resolver:
    ```csharp
    var usuario = await _usuarioRepo.BuscarPorSubjectAsync(cmd.AnalistaSubject, ct);
    var nome = usuario?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido";
    var captacao = Captacao.Criar(cmd.RubricaId, cmd.Periodo, cmd.UsuarioDeMusica, cmd.AnalistaId, nome);
    ```
- [ ] 5.4 Em `CaptacaoEndpoints.cs` (POST `/`):
  - trocar `var analistaNome = httpContext.User.GetAnalistaNome();` por `var analistaSubject = httpContext.User.GetAnalistaSubject(); var analistaNomeClaim = httpContext.User.GetAnalistaNomeClaim();`
  - montar `new CriarCaptacaoCommand(request.RubricaId, request.Periodo, request.UsuarioDeMusica, analistaId, analistaSubject, analistaNomeClaim)`.
- [ ] 5.5 Atualizar **todos** os testes que instanciam `CriarCaptacaoCommand`/chamam `GetAnalistaNome` para a nova assinatura (buscar por `new CriarCaptacaoCommand(` e `GetAnalistaNome` em `5-Tests/`).
- [ ] 5.6 Testes unitários do handler (mock do repo) — 3 cenários da Tech Spec:
  - (a) projeção encontrada → usa `NomeExibicao` da projeção (ignora claim);
  - (b) sem projeção, com claim → usa claim;
  - (c) sem projeção e sem claim → `"Desconhecido"`.
- [ ] 5.7 `dotnet build` verde; `dotnet test` (unitários) verde.

## Sequenciamento

- Bloqueado por: 1.0 (`AnalistaIdentificador` usado para o `AnalistaId` no endpoint), 2.0 (`IUsuarioIdentidadeRepository`).
- Desbloqueia: (habilita validação E2E em 7.0).
- Paralelizável: **Sim** com 3.0 e 6.0 (arquivos de command/endpoint distintos). Cuidado apenas para não conflitar com 6.0 na entidade `Captacao` (6.0 adiciona um método; 5.0 só chama `Criar`) — risco baixo.

## Detalhes de Implementação

**Por que buscar por `subject` e não por `AnalistaId` (Guid)?** A projeção é chaveada por `logto_user_id` (= `sub`, string). O `AnalistaId` (Guid derivado de MD5) não é coluna da projeção. Logo a busca é por `subject`, e o `AnalistaId` segue sendo derivado no endpoint via `GetAnalistaId()` (que delega a `AnalistaIdentificador`).

**Fallback em camadas** (RF-9 e RF-10):
1. Projeção (`BuscarPorSubjectAsync`) → `NomeExibicao` (DisplayName ?? Username ?? Email ?? LogtoUserId).
2. Claim do token (`name`/`username`).
3. `"Desconhecido"` — só quando nenhuma fonte tem nome.

**Log:** opcionalmente um `logger.LogDebug(...)` quando cair em `"Desconhecido"` (sinal de projeção desatualizada) — seguir observabilidade existente.

**Sem mudança de contrato HTTP:** `CriarCaptacaoRequest` (body) permanece `{ RubricaId, Periodo, UsuarioDeMusica }`. A resolução do nome é interna.

## Critérios de Sucesso

- Captação recém-criada cujo autor está na projeção exibe o `NomeExibicao` (não "Desconhecido", não o claim).
- Sem projeção mas com claim → usa o claim.
- Sem projeção e sem claim → "Desconhecido" (único caso admissível).
- `POST /api/v1/captacoes` mantém o mesmo contrato externo; apenas a resolução interna muda.
- Build e unitários (3 cenários) verdes.
