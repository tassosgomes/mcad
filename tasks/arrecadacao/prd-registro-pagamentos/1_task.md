---
status: pending
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

# Tarefa 1.0: Migrations V7 + V8 — tabelas uda_valor e pagamento

## Relacionada as User Stories

- [HU-01] Ajustar valor da UDA (cobertura direta — tabela uda_valor)
- [HU-03] Registrar pagamento (cobertura direta — tabela pagamento)

## Visao Geral

Criar duas migrations Flyway: V7 cria a tabela `arrecadacao.uda_valor` com indice de vigencia e seed R$ 107,31; V8 cria a tabela `arrecadacao.pagamento` com partial unique index para unicidade de pagamento CONFIRMADO por licenca+periodo.

## Requisitos

- V7: tabela `uda_valor` com id UUID, valor NUMERIC(18,6), data_vigencia DATE, criado_em TIMESTAMPTZ, criado_por VARCHAR(200) nullable
- V7: indice `ix_uda_valor_vigencia` em data_vigencia DESC
- V7: seed INSERT com valor 107.310000, data_vigencia 2026-01-01, criado_por NULL
- V8: tabela `pagamento` com FK para licencas, campos monetarios NUMERIC(18,6), periodo CHAR(7), status VARCHAR(20) com CHECK constraint
- V8: partial unique index `uq_pagamento_licenca_periodo_confirmado` em (licenca_id, periodo) WHERE status = 'CONFIRMADO'
- V8: indices auxiliares (licenca_id, periodo, status, data_registro DESC)

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V7__create_uda_valor.sql`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V8__create_pagamento.sql`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V5__create_licencas.sql` (padrao de migration existente)
  - `tasks/arrecadacao/prd-registro-pagamentos/techspec.md` (secao Modelos de Dados)
- **Skills para consultar durante implementacao:**
  - `java-architecture` — estrutura de migrations Flyway

## Subtarefas

- [ ] 1.1 Criar `V7__create_uda_valor.sql` com tabela, indice e seed
- [ ] 1.2 Criar `V8__create_pagamento.sql` com tabela, constraints, partial unique e indices

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (historico append-only UDA), RF-06 (seed R$ 107,31), RF-12 (unicidade parcial)
- Evidencia esperada: Flyway executa V7 e V8 sem erros; tabelas criadas no schema arrecadacao

## Detalhes de Implementacao

**V7__create_uda_valor.sql:**

```sql
CREATE TABLE arrecadacao.uda_valor (
    id            UUID         PRIMARY KEY,
    valor         NUMERIC(18,6) NOT NULL CHECK (valor > 0),
    data_vigencia DATE          NOT NULL,
    criado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_por    VARCHAR(200)
);

CREATE INDEX ix_uda_valor_vigencia
    ON arrecadacao.uda_valor (data_vigencia DESC);

-- Seed: valor inicial R$ 107,31
INSERT INTO arrecadacao.uda_valor (id, valor, data_vigencia, criado_em, criado_por)
VALUES ('d1e2f3a4-b5c6-7890-abcd-111111111111', 107.310000, '2026-01-01', NOW(), NULL)
ON CONFLICT DO NOTHING;
```

**V8__create_pagamento.sql:**

```sql
CREATE TABLE arrecadacao.pagamento (
    id                    UUID          PRIMARY KEY,
    licenca_id            UUID          NOT NULL REFERENCES arrecadacao.licencas(id),
    quantidade_udas       NUMERIC(18,6) NOT NULL CHECK (quantidade_udas > 0),
    valor_uda_no_momento  NUMERIC(18,6) NOT NULL,
    valor_bruto           NUMERIC(18,6) NOT NULL,
    periodo               CHAR(7)       NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'CONFIRMADO',
    data_registro         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_em             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pagamento_status CHECK (status IN ('CONFIRMADO', 'ESTORNADO'))
);

CREATE UNIQUE INDEX uq_pagamento_licenca_periodo_confirmado
    ON arrecadacao.pagamento (licenca_id, periodo)
    WHERE status = 'CONFIRMADO';

CREATE INDEX ix_pagamento_licenca_id ON arrecadacao.pagamento (licenca_id);
CREATE INDEX ix_pagamento_periodo ON arrecadacao.pagamento (periodo);
CREATE INDEX ix_pagamento_status ON arrecadacao.pagamento (status);
CREATE INDEX ix_pagamento_data_registro ON arrecadacao.pagamento (data_registro DESC);
```

## Criterios de Sucesso (Verificaveis)

- [ ] Flyway executa sem erros: `cd services/arrecadacao-api && mvn flyway:migrate`
- [ ] Tabela `arrecadacao.uda_valor` criada com seed R$ 107,31
- [ ] Tabela `arrecadacao.pagamento` criada com partial unique index
- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
