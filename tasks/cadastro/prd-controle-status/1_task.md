---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"2.0, 3.0, 4.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — Enums +Bloqueado, HistoricoBloqueio, PreRequisito, IHistoricoBloqueioRepository

## Visão Geral

Estender enums com status BLOQUEADO, criar entidade HistoricoBloqueio (polimórfica OBRA/FONOGRAMA), record PreRequisito e interface do repositório de histórico.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/HistoricoBloqueio.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Services/PreRequisito.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IHistoricoBloqueioRepository.cs`
- **Modificar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/StatusObra.cs` — adicionar `Bloqueado`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Enums/StatusFonograma.cs` — adicionar `Bloqueado`
- **Referência:**
  - `tasks/prd-controle-status/techspec.md` (seções "Enums", "HistoricoBloqueio", "PreRequisito")

## Subtarefas

- [x] 1.1 StatusObra: adicionar `Bloqueado` ao enum
- [x] 1.2 StatusFonograma: adicionar `Bloqueado` ao enum
- [x] 1.3 Criar `PreRequisito` record (Item, Atendido, Detalhe?)
- [x] 1.4 Criar `HistoricoBloqueio` — Id, EntidadeTipo (OBRA/FONOGRAMA), EntidadeId, Acao (BLOQUEIO/DESBLOQUEIO), Justificativa?, DataHora. Factory methods CriarBloqueio/CriarDesbloqueio.
- [x] 1.5 Criar `IHistoricoBloqueioRepository` — AddAsync, GetByEntidadeAsync(tipo, id)
- [x] 1.6 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] StatusObra tem 5 valores (Pendente, Liberado, Bloqueado, DominioPublico, Depurada)
- [x] StatusFonograma tem 5 valores (PendenteValidacao, PendenteDocumentacao, Liberado, Bloqueado, Depurado)
