---
status: completed
parallelizable: false
blocked_by: [2.0]
---

<task_context>
<domain>identificacao/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Application (ValidarPreRequisitos, FecharRol) + Testes

## Relacionada aos Requisitos

- RF-01 — ValidarPreRequisitosQueryHandler (checklist 5 itens, condicionais)
- RF-02 — FecharRolCommandHandler (re-valida + fecha + outbox)
- RF-03 — Payload do evento (diferenciado audiovisual/áudio)

## Visão Geral

Implementar query de pré-requisitos e command de fechamento com payload diferenciado, testes unitários para ambos.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Queries/ValidarPreRequisitosQuery.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Queries/ValidarPreRequisitosQueryHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Commands/FecharRolCommand.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Commands/FecharRolCommandHandler.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Responses/PreRequisitosResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Responses/FechamentoResponse.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Payloads/RolFechadoPayload.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ValidarPreRequisitosQueryHandlerTests.cs`
  - `services/identificacao-api/5-Tests/Identificacao.Tests/Application/FecharRolCommandHandlerTests.cs`

## Subtarefas

- [x] 3.1 Criar `PreRequisitosResponse`, `PreRequisitoItem`, `ResumoFechamento` (DTOs)
- [x] 3.2 Criar `ValidarPreRequisitosQuery` + handler — 5 itens, condicionais por rubrica, consulta Cadastro para obras LIBERADAS
- [x] 3.3 Criar `FechamentoResponse`, `RolFechadoPayload`, `ExecucaoRolPayload` (DTOs)
- [x] 3.4 Criar `FecharRolCommand` + handler — re-valida server-side, fecha, monta payload diferenciado, outbox atômico
- [x] 3.5 Testes `ValidarPreRequisitosQueryHandlerTests` — 7 cenários
- [x] 3.6 Testes `FecharRolCommandHandlerTests` — 6 cenários

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0
- Paralelizável: Não

## Detalhes de Implementação

**ValidarPreRequisitosQueryHandler:** conforme TechSpec — 5 pré-requisitos, itens 4-5 condicionais para audiovisual. Consulta Cadastro para verificar obras LIBERADAS (batch IDs únicos).

**FecharRolCommandHandler:** conforme TechSpec — re-valida todos pré-requisitos, chama `captacao.Fechar()`, monta payload diferenciado (audiovisual vs áudio), `_outboxWriter.AddEvent()`, save atômico.

**Payload diferenciado:**
- Audiovisual: `tipoUtilizacao`, `peso`, `inicio`, `fim`, `duracaoSegundos` preenchidos
- Áudio: mesmos campos = `null`, apenas `quantidade` preenchida

**Testes ValidarPreRequisitos (7):**
1. `Handle_TodosAtendidos_RetornaTrue`
2. `Handle_ZeroExecucoes_MinExecucoesFalha`
3. `Handle_3Pendentes_ZeroPendentesFalha`
4. `Handle_AudiovisualSemTipoUtilizacao_ClassificacaoFalha`
5. `Handle_AudiovisualSemHorario_HorariosFalha`
6. `Handle_NaoAudiovisual_Itens4e5NaoAparecem`
7. `Handle_ObraPendenteNoCadastro_ObrasLiberadasFalha`

**Testes FecharRol (6):**
8. `Handle_TodosPreReqOk_FechaComOutboxEvent`
9. `Handle_ComPendentes_RejeitaComCode`
10. `Handle_OutroAnalista_LancaForbidden`
11. `Handle_CaptacaoJaFechada_Rejeita`
12. `Handle_PayloadAudiovisual_IncluiTempoPeso`
13. `Handle_PayloadAudio_CamposNull`

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Testes: `cd services/identificacao-api && dotnet test --filter "FullyQualifiedName~Fechamento"`
- [x] 13 cenários cobertos
- [x] Evento outbox criado na mesma transação do fechamento
- [x] Payload audiovisual inclui tempo+peso, áudio tem campos null
