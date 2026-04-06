---
status: completed
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

# Tarefa 1.0: Migration — tabelas usuarios_musica e historico_status_usuario

## Relacionada as User Stories

- [HU-01] Cadastrar Usuario de Musica (suporte — cria tabela base)
- [HU-04] Inativar Usuario (suporte — cria tabela de historico)
- [HU-07] Visualizar historico de status (suporte)

## Visao Geral

Criar as migrations Flyway V3 e V4 que definem as tabelas `usuarios_musica` e `historico_status_usuario` no schema `arrecadacao`. Inclui indices para busca parcial via `pg_trgm` e constraint de unicidade para CNPJ.

## Requisitos

- Tabela `usuarios_musica` com colunas flat para Endereco e Contato (embeddables)
- CNPJ como VARCHAR(14) com UNIQUE constraint
- Status com CHECK constraint (ATIVO, INATIVO)
- Tabela `historico_status_usuario` com FK para `usuarios_musica`
- Indice composto (usuario_musica_id, data DESC) no historico
- Extensao `pg_trgm` para indices GIN em razao_social e cidade
- Migrations idempotentes (IF NOT EXISTS onde aplicavel)

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V3__create_usuarios_musica.sql`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V4__create_historico_status_usuario.sql`
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V1__create_tables.sql` (padrao de migration existente)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V2__seed_rubricas.sql` (padrao de seed)

## Subtarefas

- [x] 1.1 Criar V3__create_usuarios_musica.sql com tabela, constraints e indices pg_trgm
- [x] 1.2 Criar V4__create_historico_status_usuario.sql com tabela, FK e indice composto
- [x] 1.3 Verificar que Flyway executa ambas as migrations sem erro

## Sequenciamento

- Bloqueado por: Nenhum (F01 migrations V1-V2 ja existem)
- Desbloqueia: 2.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (estrutura), RF-03 (UNIQUE cnpj), RF-11/RF-12/RF-14 (tabela historico)
- Evidencia esperada: Flyway roda com sucesso; tabelas existem no schema arrecadacao

## Detalhes de Implementacao

**V3__create_usuarios_musica.sql:**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE arrecadacao.usuarios_musica (
    id                UUID        PRIMARY KEY,
    razao_social      VARCHAR(200) NOT NULL,
    nome_fantasia     VARCHAR(200),
    cnpj              VARCHAR(14)  NOT NULL UNIQUE,
    cep               VARCHAR(8)   NOT NULL,
    logradouro        VARCHAR(200) NOT NULL,
    numero            VARCHAR(20)  NOT NULL,
    complemento       VARCHAR(100),
    bairro            VARCHAR(100) NOT NULL,
    cidade            VARCHAR(100) NOT NULL,
    uf                VARCHAR(2)   NOT NULL,
    nome_responsavel  VARCHAR(200) NOT NULL,
    telefone          VARCHAR(20),
    email             VARCHAR(200),
    status            VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuarios_musica_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE INDEX ix_usuarios_musica_razao_social
    ON arrecadacao.usuarios_musica USING gin (razao_social gin_trgm_ops);
CREATE INDEX ix_usuarios_musica_cnpj
    ON arrecadacao.usuarios_musica (cnpj);
CREATE INDEX ix_usuarios_musica_cidade
    ON arrecadacao.usuarios_musica USING gin (cidade gin_trgm_ops);
CREATE INDEX ix_usuarios_musica_status
    ON arrecadacao.usuarios_musica (status);
```

**V4__create_historico_status_usuario.sql:**

```sql
CREATE TABLE arrecadacao.historico_status_usuario (
    id                 UUID         PRIMARY KEY,
    usuario_musica_id  UUID         NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    status_anterior    VARCHAR(10),
    status_novo        VARCHAR(10)  NOT NULL,
    justificativa      VARCHAR(500) NOT NULL,
    autor              VARCHAR(100) NOT NULL,
    data               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hist_status_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVO', 'INATIVO')),
    CONSTRAINT chk_hist_status_novo CHECK (status_novo IN ('ATIVO', 'INATIVO'))
);

CREATE INDEX ix_historico_status_usuario_fk
    ON arrecadacao.historico_status_usuario (usuario_musica_id, data DESC);
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [x] Flyway executa sem erro: teste de integracao existente `RubricaPersistenceIntegrationTest` continua passando
- [x] Tabelas criadas: verificavel via teste que conta migrations (espera 4)
