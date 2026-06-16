---
status: pending
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>identificacao/application/fechamento</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<risk>low</risk>
<flow_mode>standard</flow_mode>
<model_tier>standard</model_tier>
<validation_level>unit</validation_level>
<context_budget>small</context_budget>
<dependencies>none</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Identificação — Contrato do evento rol.fechado com usuarioMusicaId

## Visão Geral

O evento `identificacao.rol.fechado` passa a incluir `usuarioMusicaId` + `usuarioMusicaNome` no payload (campos aditivos opcionais), para rastreabilidade cross-domain. Mudança compatível retroativamente — Distribuição (D04) ignora os campos novos.

Cobre **RF-07** do PRD.

## Requisitos

- `RolFechadoPayload` ganha `UsuarioMusicaId` (Guid) + `UsuarioMusicaNome` (string).
- `FecharRolCommandHandler.MontarPayload` popula os novos campos a partir da captação.
- Sem quebra para consumidores existentes (campos aditivos).

## Subtarefas

- [ ] 6.1 Modificar `RolFechadoPayload.cs`: add `Guid UsuarioMusicaId, string UsuarioMusicaNome`
- [ ] 6.2 Modificar `FecharRolCommandHandler.MontarPayload`: popular novos campos (`captacao.UsuarioMusicaId`, `captacao.UsuarioMusicaNome`)
- [ ] 6.3 Teste unitário: payload do rol.fechado contém os novos campos
- [ ] 6.4 Atualizar IT/documentação de contrato do evento, se houver

## Sequenciamento

- Bloqueado por: 5.0 (captação precisa ter `UsuarioMusicaId`)
- Desbloqueia: 7.0 (não bloqueia diretamente, mas fecha o contrato de eventos)
- Paralelizável: Sim (após 5.0; pequeno e isolado)

## Detalhes de Implementação

**Skill de referência:** `dotnet-testing`.

**Payload (record existente — adicionar campos no final):**
```csharp
public record RolFechadoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime FechadoEm,
    Guid AnalistaId,
    IEnumerable<ExecucaoRolPayload> Execucoes,
    Guid UsuarioMusicaId,        // novo
    string UsuarioMusicaNome);   // novo
```

**MontarPayload (linhas 85-87):** adicionar `captacao.UsuarioMusicaId, captacao.UsuarioMusicaNome` na construção do record.

## Contexto para Agentes

### Leitura Obrigatória

- TechSpec: §Análise de Impacto (evento rol.fechado), §Inventário
- Código existente: `RolFechadoPayload.cs`, `FecharRolCommandHandler.cs` (MontarPayload)

### Pontos Críticos

- Campos aditivos — D04 (Distribuição) não os consome hoje; não quebra o consumer existente.
- Confirmar com D04 se há interesse em consumir `usuarioMusicaId` (questão aberta do PRD).

### Fora de Escopo

- Consumer de `rol.fechado` na Distribuição (fora desta feature).

## Criterios de Sucesso

- `dotnet build` verde.
- Teste unitário: payload de `rol.fechado` publicado contém `usuarioMusicaId` + `usuarioMusicaNome` não vazios.
- `dotnet test --filter "FullyQualifiedName~FecharRol"` verde.
