---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"4.0, 6.0"</unblocks>
</task_context>

# Tarefa 3.0: Infra — OutboxEventWriter (implementação) + EventTypes constantes

## Visão Geral

Implementar `OutboxEventWriter` que serializa payload e adiciona OutboxEvent ao DbContext (será persistido no mesmo SaveChanges do handler). Criar constantes EventTypes para os 8 tipos de evento.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/EventTypes.cs`
- **Referência:**
  - `tasks/prd-eventos-cadastro/techspec.md` (seção "OutboxEventWriter")

## Subtarefas

- [ ] 3.1 Criar `EventTypes` com 8 constantes:
  - `ObraLiberada = "cadastro.obra.liberada"`
  - `ObraBloqueada = "cadastro.obra.bloqueada"`
  - `ObraDominioPublico = "cadastro.obra.dominio-publico"`
  - `ObraDepurada = "cadastro.obra.depurada"`
  - `FonogramaLiberado = "cadastro.fonograma.liberado"`
  - `FonogramaDepurado = "cadastro.fonograma.depurado"`
  - `FonogramaBloqueado = "cadastro.fonograma.bloqueado"`
  - `TitularCriado = "cadastro.titular.criado"`
- [ ] 3.2 Criar `OutboxEventWriter` implementando `IOutboxEventWriter`: serializa `data` com `JsonSerializer.Serialize`, cria `OutboxEvent.Criar(type, subject, payload)`, adiciona ao `_context.OutboxEvents`
- [ ] 3.3 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] AddEvent serializa payload como JSON
- [ ] OutboxEvent adicionado ao DbContext (não salvo ainda — handler faz SaveChanges)
