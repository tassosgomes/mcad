---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>identificacao/domain + application + api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<risk>high</risk>
<flow_mode>strict</flow_mode>
<model_tier>strong</model_tier>
<validation_level>full</validation_level>
<context_budget>large</context_budget>
<dependencies>database</dependencies>
<unblocks>"6.0, 7.0"</unblocks>
</task_context>

# Tarefa 5.0: Identificação — Persistência de referência na Captação

## Visão Geral

A entidade `Captacao` troca o campo de texto livre `UsuarioDeMusica` (string) por `UsuarioMusicaId` (Guid, referência) + `UsuarioMusicaNome` (string, snapshot denormalizado para exibição resiliente). Cascata de mudanças em entity, config, migration, commands, handlers, responses, queries, filtro de listagem e audit mapper.

Cobre **RF-04** e parte do **RF-06** (filtro por usuarioMusicaId).

## Requisitos

- `Captacao.UsuarioDeMusica` → **removido**; adicionados `UsuarioMusicaId` (Guid, not null) + `UsuarioMusicaNome` (string, varchar 200, not null).
- `Criar`/`Atualizar` aceitam os novos campos.
- Migration remove a coluna antiga e adiciona as novas (limpa dados fake — fora de produção).
- Requests, responses, queries, filtro de listagem e audit mapper atualizados.

## Subtarefas

- [ ] 5.1 Modificar `Captacao.cs` (domain): substituir propriedade; atualizar `Criar`/`Atualizar`
- [ ] 5.2 Modificar `CaptacaoConfiguration.cs`: mapear novas colunas, remover antiga
- [ ] 5.3 Modificar `CriarCaptacaoCommand` + `AtualizarCaptacaoCommand`: novos campos + FluentValidation (`UsuarioMusicaId NotEmpty`, `UsuarioMusicaNome NotEmpty().MaximumLength(200)`)
- [ ] 5.4 Modificar `CriarCaptacaoCommandHandler` + `AtualizarCaptacaoCommandHandler`: passar novos campos
- [ ] 5.5 Modificar `CaptacaoResponse.cs`: add `UsuarioMusicaId`
- [ ] 5.6 Modificar `ListarCaptacoesQuery` + `Handler`: add filtro `usuarioMusicaId`; mapear `UsuarioMusicaNome`
- [ ] 5.7 Modificar `GetCaptacaoByIdQueryHandler`: mapear novos campos
- [ ] 5.8 Modificar `ICaptacaoRepository` + impl: filtro `usuarioMusicaId` em `ListarAsync`
- [ ] 5.9 Modificar `CaptacaoEndpoints.cs`: `CriarCaptacaoRequest`/`AtualizarCaptacaoRequest` (UsuarioMusicaId+Nome); param `usuarioMusicaId` no GET list
- [ ] 5.10 Modificar `IdentificacaoAuditMappers.cs`: campos de auditoria
- [ ] 5.11 Criar/atualizar EF migration (colunas captação + projeção da task 3.0, se não criada)
- [ ] 5.12 Atualizar testes: `CaptacaoTests`, `CriarCaptacaoCommandHandlerTests`, `AtualizarCaptacaoCommandHandlerTests`, IT fixtures
- [ ] 5.13 Atualizar `CancelarRolCommandHandler` (linha 74 referencia `captacao.UsuarioDeMusica` no payload de cancelamento)

## Sequenciamento

- Bloqueado por: 3.0 (mesmo DbContext; coordenar migration)
- Desbloqueia: 6.0 (rol.fechado precisa de UsuarioMusicaId), 7.0 (frontend precisa do novo contrato)
- Paralelizável: Não (cascata ampla;高风险 breaking change)

## Detalhes de Implementação

**Skills de referência:** `dotnet-architecture` (entities, FluentValidation, CQRS), `dotnet-testing`.

**Entity change:**
```csharp
public Guid UsuarioMusicaId { get; private set; }
public string UsuarioMusicaNome { get; private set; } = string.Empty;

public static Captacao Criar(Guid rubricaId, DateOnly periodo, Guid usuarioMusicaId,
    string usuarioMusicaNome, Guid analistaId, string analistaNome) => new() { ... };

public void Atualizar(Guid rubricaId, DateOnly periodo, Guid usuarioMusicaId, string usuarioMusicaNome) { ... }
```

**Migration:** remover coluna `UsuarioDeMusica`, adicionar `UsuarioMusicaId` (uuid, not null) + `UsuarioMusicaNome` (varchar 200, not null). Como dados são fake, sem backfill de negócio. Coordenar com a migration da projeção (task 3.0) — se a projeção ainda não tem migration, criar uma migration unificada `AddUsuarioMusicaSnapshotAndCaptacaoRef`.

**CancelarRolCommandHandler (linha 74):** o payload de cancelamento usa `captacao.UsuarioDeMusica` — trocar por `captacao.UsuarioMusicaNome` (e adicionar `UsuarioMusicaId` se aplicável ao payload).

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Modelo de Dados — Captação, §Análise de Impacto, §Inventário (Identificação — A Modificar)
- Código existente: `Captacao.cs`, `CaptacaoConfiguration.cs`, `CaptacaoEndpoints.cs`
- Código existente: `CriarCaptacaoCommandHandler.cs`, `CancelarRolCommandHandler.cs`
- `dotnet-architecture`: FluentValidation em commands, Result/exceptions

### Pontos Críticos

- Migration **breaking** (coluna removida) — todos os callers devem ser atualizados simultaneamente.
- `CancelarRolCommandHandler.cs:74` e `FecharRolCommandHandler` referenciam o campo antigo — não esquecer (a task 6.0 cobre rol.fechado; o cancelamento é coberto aqui em 5.13).
- Testes de IT existentes usam `usuarioDeMusica = "..."` (ex: `ResponsavelAmigavelIntegrationTests.cs`) — atualizar para o novo contrato.

### Fora de Escopo

- Evento `rol.fechado` (task 6.0 cobre o payload adicional).
- Frontend (task 7.0).

## Criterios de Sucesso

- `dotnet build` verde.
- `dotnet test` (unit + IT) verde após atualização de fixtures.
- `Captacao.UsuarioDeMusica` não existe mais; `UsuarioMusicaId` + `UsuarioMusicaNome` presentes.
- `POST /api/v1/captacoes` com `{ "usuarioMusicaId": "<guid>", "usuarioMusicaNome": "..." }` cria captação com 201.
- `GET /api/v1/captacoes?usuarioMusicaId=<guid>` filtra corretamente.
- `dotnet format --verify-no-changes` sem alterações pendentes.
