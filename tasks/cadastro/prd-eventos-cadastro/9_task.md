---
status: pending
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 9.0: Testes Integração — Handler → outbox transacional + Worker publica

## Visão Geral

Testes de integração validando o fluxo completo: handler executa ação → outbox contém evento (mesma transação), handler com rollback → outbox vazia, worker publica evento pendente.

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.IntegrationTests/OutboxIntegrationTests.cs`
- **Referência:**
  - `5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` (existente)

## Subtarefas

- [ ] 9.1 **Liberar obra → outbox:** criar obra completa (titulares 100% + ISWC), POST /liberar → SELECT outbox WHERE type='cadastro.obra.liberada' → 1 registro com payload correto (obraId, titulo, iswc)
- [ ] 9.2 **Criar titular → outbox:** POST /titulares → SELECT outbox WHERE type='cadastro.titular.criado' → 1 registro
- [ ] 9.3 **Transação rollback → outbox vazia:** POST /titulares com CPF inválido (422, rollback) → outbox vazia (zero registros)
- [ ] 9.4 **Bloquear obra → outbox:** POST /bloquear → outbox contém evento com justificativa no payload
- [ ] 9.5 **Depurar obra → outbox:** POST /depurar → outbox contém evento com novaObraId
- [ ] 9.6 **Worker publica:** inserir evento manual na outbox (PublishedAt=null) → aguardar ciclo (6s) → PublishedAt preenchido (mock RabbitMQ no integration test)
- [ ] 9.7 **Múltiplos eventos:** liberar obra + bloquear fonograma na sequência → outbox contém 2 eventos ordenados

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test --filter "Namespace~IntegrationTests"` — todos passam
- [ ] Mínimo 7 testes de integração
- [ ] Teste de rollback prova transacionalidade (outbox vazia após falha)
- [ ] Teste de worker prova publicação (PublishedAt preenchido)
