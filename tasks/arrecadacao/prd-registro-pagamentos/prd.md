# PRD — F04: Registro de Pagamentos

> Domínio: Arrecadação (D03), Feature ID: F04, Prioridade: Must Have, Status: planned, Data: 2026-04-05

---

## 1. Contexto

O ECAD arrecada direitos autorais de estabelecimentos que utilizam música publicamente. As Licenças (F03) formalizam esse uso. O **Registro de Pagamentos** é o mecanismo pelo qual esses valores são efetivamente lançados no sistema, viabilizando o cálculo posterior da verba líquida (F05) e o eventual estorno (F06).

Pagamentos são expressos em **UDAs (Unidade de Direito Autoral)** — unidade de referência monetária cujo valor em R$ é ajustado periodicamente por decisão administrativa. O sistema registra a quantidade de UDAs, o valor da UDA no momento do registro (snapshot imutável) e calcula automaticamente o valor bruto.

---

## 2. Rastreabilidade

| Referência | Descrição |
|------------|-----------|
| Domain Doc F04 | Registro de Pagamentos |
| RN-02 | Pagamento vinculado a Licença ativa |
| RN-04 | Licença SUSPENSA também pode receber pagamento (estendido por F03 RF-10) |
| RN-06 | Valores monetários em alta precisão decimal |
| RN-10 | Enquadramento da UDA (parcial — enquadramento completo fora do escopo) |

**Upstream:** F03 — Gestão de Licenças (Licença deve existir e estar ATIVA ou SUSPENSA)
**Downstream:** F05 — Cálculo de Verba Líquida; F06 — Estorno de Pagamentos

---

## 3. Objetivos

- Registrar pagamentos de direitos autorais em UDAs contra uma Licença existente
- Gerenciar o valor vigente da UDA (entidade global append-only com histórico)
- Garantir unicidade de pagamentos por licença e período (1 CONFIRMADO por licença+período)
- Publicar evento `arrecadacao.pagamento.registrado` via Outbox Pattern (CloudEvents 1.0)
- Permitir consulta e detalhamento de pagamentos com filtros

---

## 4. Entidade UDA

A UDA é uma entidade global do domínio Arrecadação. Seu histórico é **append-only** — cada ajuste insere um novo registro; valores anteriores são imutáveis.

### 4.1 Atributos

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único do registro de valor |
| valor | decimal (alta precisão) | Valor da UDA em R$ |
| dataVigencia | date | Data a partir da qual este valor está vigente |
| criadoEm | datetime | Timestamp de criação do registro |
| criadoPor | string (nullable) | Username do autor (null para registros de seed) |

### 4.2 Regras

- **Valor vigente** = registro com maior `dataVigencia` <= data de hoje
- Se não houver nenhum registro com `dataVigencia` <= hoje, o endpoint `/uda/vigente` retorna 404
- Apenas Analista pode inserir novo valor; Consultor pode apenas visualizar
- **Seed Flyway:** R$ 107,31 com `dataVigencia` = 2026-01-01, `criadoPor` = null

---

## 5. Entidade Pagamento

### 5.1 Atributos

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| id | UUID | Identificador único |
| licencaId | UUID (FK) | Licença à qual o pagamento está vinculado |
| quantidadeUdas | decimal (> 0) | Quantidade de UDAs pagas (frações permitidas) |
| valorUdaNoMomento | decimal | Snapshot do valor da UDA vigente no momento do registro (imutável) |
| valorBruto | decimal | quantidadeUdas × valorUdaNoMomento (calculado pelo sistema) |
| periodo | string (YYYY-MM) | Período de referência (mês corrente, preenchido automaticamente pelo backend) |
| status | enum | CONFIRMADO ou ESTORNADO |
| dataRegistro | datetime | Timestamp do registro |
| criadoEm | datetime | Timestamp de criação |
| atualizadoEm | datetime | Timestamp da última atualização |

### 5.2 Regras de Negócio

**RN-P01 — Licença elegível:** Pagamento só pode ser registrado para Licença com status ATIVA ou SUSPENSA. Licença ENCERRADA deve ser rejeitada com erro 422.

**RN-P02 — Quantidade positiva:** `quantidadeUdas` deve ser decimal > 0. Frações permitidas (ex: 2.5, 0.75).

**RN-P03 — Cálculo automático:** `valorBruto` = `quantidadeUdas` × `valorUdaVigente`. Calculado exclusivamente pelo backend no momento do registro.

**RN-P04 — Snapshot imutável:** `valorUdaNoMomento` é salvo no pagamento e nunca alterado, mesmo que a UDA seja reajustada posteriormente.

**RN-P05 — Período automático:** `periodo` é sempre o mês corrente (YYYY-MM) preenchido automaticamente pelo backend. O campo não é enviado pelo frontend e não é editável após o registro.

**RN-P06 — Unicidade por período:** Apenas 1 pagamento com status CONFIRMADO por `(licença, período)`. Tentativa de segundo registro deve retornar HTTP 409 com mensagem clara. Implementado via UNIQUE constraint parcial no banco de dados: `UNIQUE (licenca_id, periodo) WHERE status = 'CONFIRMADO'`.

**RN-P07 — Status inicial:** Todo pagamento é criado com status CONFIRMADO. A transição para ESTORNADO é responsabilidade de F06.

**RN-P08 — UDA vigente obrigatória:** Se não existir UDA vigente no momento do registro, o sistema rejeita com erro 422.

**RN-P09 — Imutabilidade pós-registro:** Pagamentos confirmados não podem ser editados. A única operação possível após o registro é o estorno (F06).

---

## 6. Histórias de Usuário

### HU-01 — Ajustar valor da UDA

**Como** Analista de Arrecadação,
**Quero** inserir um novo valor para a UDA com data de vigência,
**Para que** os pagamentos futuros reflitam o valor atualizado sem afetar pagamentos já registrados.

**Critérios de Aceitação:**

```
Dado que sou Analista autenticado
  E forneço valor decimal > 0 e dataVigencia válida
Quando submeto a requisição POST /uda
Então um novo registro de UDA é criado com status 201
  E o valor vigente passa a ser o maior dataVigencia <= hoje

Dado que forneço valor <= 0 ou dataVigencia inválida
Quando submeto a requisição
Então recebo erro 400 com detalhes dos campos inválidos

Dado que sou Consultor
Quando tento criar um novo valor de UDA
Então recebo erro 403
```

### HU-02 — Consultar histórico da UDA

**Como** Analista ou Consultor,
**Quero** visualizar todos os registros históricos de valor da UDA,
**Para que** eu possa auditar a evolução dos valores ao longo do tempo.

**Critérios de Aceitação:**

```
Dado que estou autenticado (qualquer perfil)
Quando acesso GET /uda/historico
Então recebo a lista completa de registros ordenados por dataVigencia DESC
  E cada registro exibe: id, valor, dataVigencia, criadoEm, criadoPor (nullable)

Dado que não há nenhum registro (sistema vazio)
Quando acesso GET /uda/historico
Então recebo lista vazia (array []) com status 200
```

### HU-03 — Registrar pagamento

**Como** Analista de Arrecadação,
**Quero** registrar um pagamento de UDAs contra uma Licença ativa,
**Para que** o valor arrecadado seja lançado no sistema para cálculo posterior.

**Critérios de Aceitação:**

```
Dado que sou Analista autenticado
  E a Licença informada possui status ATIVA ou SUSPENSA
  E não existe pagamento CONFIRMADO para esta licença no mês corrente
  E existe UDA vigente
  E quantidadeUdas > 0
Quando submeto POST /pagamentos com licencaId e quantidadeUdas
Então o sistema registra o pagamento com status CONFIRMADO
  E retorna 201 com o recurso completo incluindo valorBruto calculado
  E publica evento arrecadacao.pagamento.registrado via Outbox

Dado que a Licença possui status ENCERRADA
Quando submeto o registro
Então recebo erro 422: "Não é possível registrar pagamento para licença com status ENCERRADA"

Dado que já existe pagamento CONFIRMADO para esta licença no mês corrente
Quando submeto o registro
Então recebo erro 409: "Já existe pagamento confirmado para esta licença no período YYYY-MM"

Dado que não existe UDA vigente
Quando submeto o registro
Então recebo erro 422: "Não há valor de UDA vigente para a data atual"

Dado que sou Consultor
Quando tento registrar pagamento
Então recebo erro 403
```

### HU-04 — Consultar pagamentos

**Como** Analista ou Consultor,
**Quero** visualizar a lista de pagamentos com filtros e paginação,
**Para que** eu possa monitorar e auditar os registros de arrecadação.

**Critérios de Aceitação:**

```
Dado que estou autenticado
Quando acesso GET /pagamentos sem filtros
Então recebo lista paginada com todos os pagamentos, ordenada por dataRegistro DESC

Dado que filtro por usuarioMusicaId, razaoSocial, rubricaSigla, periodo ou status
Quando acesso GET /pagamentos com esses filtros
Então recebo apenas os pagamentos que atendem a todos os critérios (AND)

Dado que especifico page e size
Quando acesso GET /pagamentos
Então recebo a paginação correta com total e totalPages
```

### HU-05 — Visualizar detalhes do pagamento

**Como** Analista ou Consultor,
**Quero** visualizar os detalhes completos de um pagamento específico,
**Para que** eu possa verificar os dados do registro incluindo informações da licença vinculada.

**Critérios de Aceitação:**

```
Dado que estou autenticado
  E o pagamento existe
Quando acesso GET /pagamentos/{id}
Então recebo o pagamento com dados expandidos:
  - Licença resumida (id, numero, status)
  - Usuário de Música resumido (id, razaoSocial, cnpj)
  - Rubrica resumida (id, sigla, nome)
  - quantidadeUdas, valorUdaNoMomento, valorBruto (todos como string decimal)
  - periodo, status, dataRegistro, criadoEm, atualizadoEm

Dado que o ID não existe
Quando acesso GET /pagamentos/{id}
Então recebo erro 404
```

### HU-06 — Consultar UDA vigente

**Como** Analista ou Consultor,
**Quero** consultar o valor atual da UDA,
**Para que** eu possa informar ao cliente quanto ele pagará por UDA antes de registrar.

**Critérios de Aceitação:**

```
Dado que estou autenticado
  E existe UDA com dataVigencia <= hoje
Quando acesso GET /uda/vigente
Então recebo o registro de UDA mais recente com status 200

Dado que não existe nenhuma UDA com dataVigencia <= hoje
Quando acesso GET /uda/vigente
Então recebo erro 404
```

---

## 7. Requisitos Funcionais

### 7.1 Gestão de UDA

| ID | Descrição |
|----|-----------|
| RF-01 | O sistema deve manter histórico append-only de valores da UDA |
| RF-02 | O sistema deve identificar o valor vigente como o registro com maior dataVigencia <= hoje |
| RF-03 | Apenas Analista pode inserir novos valores de UDA |
| RF-04 | Analista e Consultor podem consultar o histórico completo da UDA |
| RF-05 | Analista e Consultor podem consultar o valor vigente da UDA |
| RF-06 | O seed Flyway deve inserir R$ 107,31 com dataVigencia = 2026-01-01 e criadoPor = null |

### 7.2 Registro de Pagamento

| ID | Descrição |
|----|-----------|
| RF-07 | O sistema deve aceitar pagamentos apenas para Licenças com status ATIVA ou SUSPENSA |
| RF-08 | O sistema deve rejeitar pagamentos para Licenças ENCERRADAS com erro 422 |
| RF-09 | O sistema deve calcular valorBruto = quantidadeUdas × valorUdaVigente automaticamente |
| RF-10 | O sistema deve salvar snapshot do valorUdaNoMomento no registro de pagamento |
| RF-11 | O sistema deve preencher automaticamente o campo periodo com o mês corrente (YYYY-MM) |
| RF-12 | O sistema deve rejeitar registro de segundo pagamento CONFIRMADO para mesma licença+período com HTTP 409 |
| RF-13 | O sistema deve publicar evento arrecadacao.pagamento.registrado via Outbox (CloudEvents 1.0) após registro bem-sucedido |

### 7.3 Consulta de Pagamentos

| ID | Descrição |
|----|-----------|
| RF-14 | O sistema deve listar pagamentos com paginação server-side (page/size) |
| RF-15 | O sistema deve suportar filtros por usuarioMusicaId, razaoSocial, rubricaSigla, periodo e status |
| RF-16 | O sistema deve retornar pagamento por ID com dados expandidos (licença, usuário de música, rubrica) |
| RF-17 | A ordenação padrão da listagem deve ser dataRegistro DESC |

---

## 8. Não-Escopo (Non-Goals)

- **Estorno de pagamentos** — tratado em F06
- **Cálculo de verba líquida** — tratado em F05
- **Geração de boleto** — fora do escopo do PoC
- **Enquadramento completo da UDA** (RN-10 completo) — apenas snapshot simples
- **Multas e juros** por atraso — fora do escopo
- **Períodos retroativos** — o período é sempre o mês corrente
- **Múltiplos pagamentos confirmados** por licença+período
- **Edição de pagamento** após registro — apenas consulta e estorno (F06)
- **Integração com sistemas legados** de arrecadação

---

## 9. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Precisão decimal | BigDecimal (Java) / string JSON | Evitar perda de precisão em cálculos monetários (RN-06) |
| Unicidade pagamento | UNIQUE constraint parcial: `(licenca_id, periodo) WHERE status = 'CONFIRMADO'` | Permite múltiplos estornados mas só 1 confirmado por período |
| Evento Outbox | CloudEvents 1.0 com tipo `arrecadacao.pagamento.registrado` | Consistência eventual com garantia de entrega |
| UDA como recurso independente | `/api/v1/uda/` (não sub-recurso) | UDA é entidade global, não pertence a nenhum agregado específico |
| criadoPor nullable | Nullable na entidade UDA | Seed Flyway não possui usuário autenticado |
| Schema banco | arrecadacao | Isolamento de domínio conforme arquitetura |
| Stack | Java Spring Boot | Conforme decisão de plataforma D03 |

---

## 10. Modelo de Dados (Referência)

```sql
-- Tabela de valores históricos da UDA
CREATE TABLE arrecadacao.uda_valor (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valor        NUMERIC(18, 6)  NOT NULL CHECK (valor > 0),
    data_vigencia DATE            NOT NULL,
    criado_em    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    criado_por   VARCHAR(200)    -- nullable (seed não tem autor)
);

-- Tabela de pagamentos
CREATE TABLE arrecadacao.pagamento (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licenca_id           UUID            NOT NULL REFERENCES arrecadacao.licenca(id),
    quantidade_udas      NUMERIC(18, 6)  NOT NULL CHECK (quantidade_udas > 0),
    valor_uda_no_momento NUMERIC(18, 6)  NOT NULL,
    valor_bruto          NUMERIC(18, 6)  NOT NULL,
    periodo              CHAR(7)         NOT NULL, -- YYYY-MM
    status               VARCHAR(20)     NOT NULL DEFAULT 'CONFIRMADO',
    data_registro        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    criado_em            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    atualizado_em        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Unicidade: 1 pagamento CONFIRMADO por licença+período
CREATE UNIQUE INDEX uq_pagamento_licenca_periodo_confirmado
    ON arrecadacao.pagamento (licenca_id, periodo)
    WHERE status = 'CONFIRMADO';
```

---

## 11. Evento de Domínio

### arrecadacao.pagamento.registrado (CloudEvents 1.0)

```json
{
  "specversion": "1.0",
  "type": "arrecadacao.pagamento.registrado",
  "source": "/arrecadacao/pagamentos",
  "id": "evt-uuid-aqui",
  "time": "2026-04-05T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "pagamentoId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "licencaId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "periodo": "2026-04",
    "quantidadeUdas": "2.500000",
    "valorUdaNoMomento": "107.310000",
    "valorBruto": "268.275000",
    "status": "CONFIRMADO",
    "dataRegistro": "2026-04-05T14:30:00Z"
  }
}
```
