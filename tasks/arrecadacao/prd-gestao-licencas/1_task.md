---
status: completed
parallelizable: false
blocked_by: []
---

<task_context>
<domain>arrecadacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Migration — tabelas licencas e historico_status_licenca

## Relacionada as User Stories
- [HU-01] Criar Licenca (suporte — cria tabela base)
- [HU-02] Suspender Licenca (suporte — status machine)
- [HU-03] Reativar Licenca (suporte — status machine)
- [HU-04] Encerrar Licenca (suporte — status machine)
- [HU-05] Visualizar historico de status (suporte — cria tabela de historico)

## Visao Geral

Criar as migrations Flyway V5 e V6 que definem as tabelas `licencas` e `historico_status_licenca` no schema `arrecadacao`. Inclui indices para busca por status, vigencia e FK constraints para `usuarios_musica` e `rubricas`. Nao ha constraint UNIQUE em (usuario_musica_id, rubrica_id) — o mesmo usuario pode ter multiplas licencas ativas para a mesma rubrica.

## Requisitos

- Tabela `licencas` com colunas: id, usuario_musica_id, rubrica_id, data_inicio, data_fim (nullable), status, criado_em, atualizado_em
- FK para `arrecadacao.usuarios_musica(id)` e `arrecadacao.rubricas(id)`
- CHECK constraint para status (ATIVA, SUSPENSA, ENCERRADA)
- Sem UNIQUE constraint em (usuario_musica_id, rubrica_id) — multiplas licencas permitidas
- Indice parcial em data_fim WHERE NOT NULL para filtro vigente performatico
- Tabela `historico_status_licenca` com FK para `licencas(id)`
- Indice composto (licenca_id, data DESC) no historico

## Arquivos Envolvidos

- **Criar:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V5__create_licencas.sql`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V6__create_historico_status_licenca.sql`
- **Modificar:** Nenhum
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V3__create_usuarios_musica.sql` (padrao de migration existente)
  - `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V4__create_historico_status_usuario.sql` (padrao historico existente)

## Subtarefas

- [ ] 1.1 Criar V5__create_licencas.sql com tabela, FK constraints e indices
- [ ] 1.2 Criar V6__create_historico_status_licenca.sql com tabela, FK e indice composto
- [ ] 1.3 Verificar que Flyway executa ambas as migrations sem erro

## Sequenciamento

- Bloqueado por: Nenhum (F01 e F02 migrations V1-V4 ja existem)
- Desbloqueia: 2.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 (estrutura da tabela), RF-02 (ausencia de UNIQUE em usuario+rubrica), RF-13 (tabela historico)
- Evidencia esperada: Flyway roda com sucesso; tabelas existem no schema arrecadacao; contagem de migrations = 6

## Detalhes de Implementacao

**V5__create_licencas.sql:**

```sql
CREATE TABLE arrecadacao.licencas (
    id                UUID        PRIMARY KEY,
    usuario_musica_id UUID        NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    rubrica_id        UUID        NOT NULL REFERENCES arrecadacao.rubricas(id),
    data_inicio       DATE        NOT NULL,
    data_fim          DATE,
    status            VARCHAR(15) NOT NULL DEFAULT 'ATIVA',
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_licencas_status CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_licencas_usuario_musica_id ON arrecadacao.licencas (usuario_musica_id);
CREATE INDEX ix_licencas_rubrica_id ON arrecadacao.licencas (rubrica_id);
CREATE INDEX ix_licencas_status ON arrecadacao.licencas (status);
CREATE INDEX ix_licencas_data_inicio ON arrecadacao.licencas (data_inicio DESC);
CREATE INDEX ix_licencas_vigente ON arrecadacao.licencas (data_fim)
    WHERE data_fim IS NOT NULL;
```

**V6__create_historico_status_licenca.sql:**

```sql
CREATE TABLE arrecadacao.historico_status_licenca (
    id              UUID         PRIMARY KEY,
    licenca_id      UUID         NOT NULL REFERENCES arrecadacao.licencas(id),
    status_anterior VARCHAR(15),
    status_novo     VARCHAR(15)  NOT NULL,
    justificativa   VARCHAR(500) NOT NULL,
    autor           VARCHAR(100) NOT NULL,
    data            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hist_licenca_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
    CONSTRAINT chk_hist_licenca_novo CHECK (status_novo IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_historico_status_licenca_fk
    ON arrecadacao.historico_status_licenca (licenca_id, data DESC);
```

**Observacoes:**
- `data_fim` nullable permite vigencia indefinida (sem data de encerramento prevista)
- O indice parcial `ix_licencas_vigente` filtra apenas linhas com data_fim preenchida, otimizando a query `vigente=false`
- Para `vigente=true`, a condition `(data_fim IS NULL OR data_fim >= CURRENT_DATE)` usa scan de tabela ou ix_licencas_vigente combinado

## Criterios de Sucesso (Verificaveis)

- [ ] Build compila: `cd services/arrecadacao-api && mvn compile -pl arrecadacao-infra`
- [ ] Flyway executa sem erro: teste de integracao existente `RubricaPersistenceIntegrationTest` continua passando
- [ ] Tabelas criadas: verificavel via teste que conta migrations (espera 6 apos V5 e V6)
- [ ] FK para usuarios_musica e rubricas funcionam (insert com UUID inexistente falha)
- [ ] CHECK constraint rejeita status invalido (ex: 'CANCELADA')
