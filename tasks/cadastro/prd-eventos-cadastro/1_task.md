---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/domain</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Domain — OutboxEvent entidade + IOutboxEventWriter interface

## Visão Geral

Criar entidade OutboxEvent (Id, Type, RoutingKey, Subject, Payload, CreatedAt, PublishedAt nullable, Attempts) com factory Criar, MarcarPublicado, IncrementarTentativa, ExcedeuTentativas. Interface IOutboxEventWriter no Domain.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IOutboxEventWriter.cs`
- **Referência:**
  - `tasks/prd-eventos-cadastro/techspec.md` (seções "OutboxEvent", "IOutboxEventWriter")

## Subtarefas

- [ ] 1.1 Criar `OutboxEvent` — factory Criar(type, subject, payload), MarcarPublicado(), IncrementarTentativa(), property ExcedeuTentativas (>=10)
- [ ] 1.2 Criar `IOutboxEventWriter` — AddEvent(string eventType, string subject, object data)
- [ ] 1.3 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Domain project com 0 PackageReferences
- [ ] OutboxEvent.Criar retorna PublishedAt=null, Attempts=0
- [ ] ExcedeuTentativas → true se Attempts >= 10
