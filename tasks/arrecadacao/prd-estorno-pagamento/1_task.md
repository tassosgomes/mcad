---
status: done
parallelizable: false
blocked_by: []
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Migration V9 — colunas de estorno no pagamento

## Relacionada as User Stories

- [HU-01] Estornar pagamento (cobertura direta — schema)

## Visao Geral

Criar migration Flyway V9 que adiciona 3 colunas nullable a tabela `arrecadacao.pagamento`: `justificativa_estorno`, `estornado_por` e `estornado_em`. Campos sao null enquanto pagamento esta CONFIRMADO e preenchidos no momento do estorno.

## Requisitos

1. ALTER TABLE arrecadacao.pagamento ADD COLUMN justificativa_estorno VARCHAR(500)
2. ALTER TABLE arrecadacao.pagamento ADD COLUMN estornado_por VARCHAR(200)
3. ALTER TABLE arrecadacao.pagamento ADD COLUMN estornado_em TIMESTAMPTZ
4. Sem indices adicionais (consulta por ID, nao por filtro)
5. Migration idempotente e nao destrutiva

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V9__add_estorno_columns_pagamento.sql`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V8__create_pagamento.sql` (tabela original)

## Subtarefas

- [x] 1.1 Criar `V9__add_estorno_columns_pagamento.sql` com ALTER TABLE + 3 colunas

## Detalhes de Implementacao

```sql
ALTER TABLE arrecadacao.pagamento
    ADD COLUMN justificativa_estorno VARCHAR(500),
    ADD COLUMN estornado_por VARCHAR(200),
    ADD COLUMN estornado_em TIMESTAMPTZ;
```

## Testes

- [x] Flyway executa V9 sem erros (validado nos testes de integracao da task 4.0)
- [x] Colunas existem e aceitam NULL (pagamentos existentes nao quebram)

## Criterios de Sucesso

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [x] Migration V9 executa sem erros em sequencia com V1-V8
