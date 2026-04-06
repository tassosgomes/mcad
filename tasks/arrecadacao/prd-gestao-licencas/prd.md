# PRD — F03: Gestão de Licenças

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F03
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-04

---

## 1. Visão Geral

Gestão de Licenças é o núcleo funcional do domínio de Arrecadação. Uma Licença representa o vínculo formal entre um **Usuário de Música** (empresa/pessoa que usa música publicamente) e uma **Rubrica** (categoria de uso musical), estabelecendo a vigência desse uso e o ciclo de vida do contrato de licenciamento.

Esta feature implementa o CRUD de licenças com controle de status (ATIVA → SUSPENSA → ENCERRADA) e histórico auditável de transições.

---

## 2. Contexto e Rastreabilidade

| Referência | Documento | Item |
|---|---|---|
| Vision | `vision.md` | "Controlar licenciamento de uso de música" |
| Domain Doc | `docs/arrecadacao/domain.md` | F03, RN-03, RN-04, RN-12 |
| Upstream | F01 (Seed de Rubricas), F02 (Gestão de Usuários de Música) | Rubricas e Usuários devem existir antes |
| Downstream | F04 (Registro de Pagamentos), F05 (Cálculo de Verba Líquida) | Licença ATIVA ou SUSPENSA recebe pagamentos |

---

## 3. User Stories

| ID | Como | Quero | Para |
|----|------|-------|------|
| HU-01 | Analista de Arrecadação | Criar uma licença vinculando um Usuário de Música a uma Rubrica com vigência definida | Formalizar o contrato de licenciamento |
| HU-02 | Analista de Arrecadação | Suspender uma licença ATIVA informando justificativa | Interromper temporariamente o licenciamento sem encerrá-lo |
| HU-03 | Analista de Arrecadação | Reativar uma licença SUSPENSA informando justificativa | Retomar o licenciamento após suspensão |
| HU-04 | Analista de Arrecadação | Encerrar uma licença SUSPENSA informando justificativa | Terminar definitivamente o contrato de licenciamento |
| HU-05 | Analista ou Consultor | Listar licenças com filtros e paginação | Encontrar e monitorar licenças do portfólio |
| HU-06 | Analista ou Consultor | Ver os detalhes de uma licença e seu histórico de transições de status | Auditar o ciclo de vida do contrato |
| HU-07 | Analista de Arrecadação | Selecionar uma licença ATIVA ou SUSPENSA ao registrar um pagamento | Vincular o pagamento ao contrato correto (F04) |

> HU-07 é implementada em F04 — este PRD define apenas o contrato de seleção/busca de licenças.

---

## 4. Requisitos Funcionais

### 4.1 Criação de Licença

**RF-01 — Criar Licença**
O sistema deve permitir criar uma licença vinculando um `usuarioMusicaId` a um `rubricaId`, com `dataInicio` obrigatória e `dataFim` opcional (indefinida = vigência aberta).

**RF-02 — Múltiplas licenças simultâneas**
Deve ser permitido criar mais de uma licença para o mesmo par Usuário + Rubrica simultaneamente. Não há restrição de unicidade nesse par.

**RF-03 — Usuário deve estar ATIVO**
Não deve ser possível criar uma licença para um Usuário de Música com status INATIVO.

**RF-04 — dataInicio não pode ser no passado**
A `dataInicio` deve ser maior ou igual à data atual (hoje). Datas retroativas são rejeitadas.

**RF-05 — dataFim deve ser posterior a dataInicio**
Se informada, a `dataFim` deve ser estritamente maior que `dataInicio`.

**RF-06 — Status inicial**
O status inicial de toda licença criada é **ATIVA**.

### 4.2 Controle de Status

O ciclo de vida de uma licença segue o diagrama:

```
ATIVA ──suspender──→ SUSPENSA ──encerrar──→ ENCERRADA
SUSPENSA ──reativar──→ ATIVA
```

> Transição direta ATIVA → ENCERRADA NÃO É PERMITIDA. A licença deve ser suspensa primeiro.

**RF-07 — Suspender (ATIVA → SUSPENSA)**
Apenas licenças com status ATIVA podem ser suspensas. Requer `justificativa` (mínimo 10 caracteres).

**RF-08 — Reativar (SUSPENSA → ATIVA)**
Apenas licenças com status SUSPENSA podem ser reativadas. Requer `justificativa` (mínimo 10 caracteres).

**RF-09 — Encerrar (SUSPENSA → ENCERRADA)**
Apenas licenças com status SUSPENSA podem ser encerradas. Encerramento é irreversível — não há transição de saída do status ENCERRADA. Requer `justificativa` (mínimo 10 caracteres).

**RF-10 — Licença SUSPENSA recebe pagamentos**
Licenças com status SUSPENSA podem receber registros de pagamento (F04). A suspensão não bloqueia pagamentos já referentes ao período de vigência anterior.

**RF-11 — Encerramento não é permitido a partir de ATIVA**
Tentar encerrar uma licença ATIVA diretamente deve retornar 422 com mensagem de negócio explicando que é necessário suspender antes.

**RF-12 — Licença ENCERRADA é imutável**
Nenhuma transição de status pode ser aplicada a uma licença ENCERRADA.

### 4.3 Histórico de Transições

**RF-13 — Registro automático de histórico**
Cada transição de status (criação, suspensão, reativação, encerramento) deve gerar automaticamente um registro no histórico com:
- `data`: data/hora da transição (ISO 8601)
- `autor`: username extraído do claim `preferred_username` do JWT
- `statusAnterior`: status antes da transição (null na criação)
- `statusNovo`: status resultante da transição
- `justificativa`: texto informado (ou "Licença criada" na criação)

### 4.4 Listagem e Consulta

**RF-14 — Listar com paginação e filtros**
A listagem deve suportar os seguintes filtros combinados com AND:

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| `usuarioMusicaId` | uuid | Exato |
| `razaoSocial` | string | Parcial, case-insensitive |
| `rubricaSigla` | string | Parcial, case-insensitive |
| `status` | enum | Exato |
| `vigente` | boolean | `true` = dataFim is null OR dataFim >= hoje; `false` = dataFim < hoje |

**RF-15 — Ordenação padrão**
O sort padrão é `-dataInicio` (dataInicio DESC — mais recentes primeiro).

**RF-16 — Paginação padrão**
Page=1, Size=20, máximo 100 itens por página.

**RF-17 — Resposta com dados expandidos**
A listagem e o detalhe devem retornar `usuarioMusica` (id, razaoSocial, cnpjFormatado) e `rubrica` (id, sigla, nome) expandidos — não apenas os IDs.

---

## 5. Critérios de Aceitação

### RF-03 — Usuário INATIVO

```gherkin
Dado que existe um Usuário de Música com status INATIVO
Quando o Analista tentar criar uma licença para este Usuário
Então o sistema deve retornar HTTP 422
  E a mensagem de erro deve conter "Usuário de Música está INATIVO e não pode receber novas licenças"
```

### RF-04 — dataInicio no passado

```gherkin
Dado que a data atual é 2026-04-05
Quando o Analista enviar dataInicio = "2026-04-04"
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "dataInicio não pode ser anterior à data atual"
```

### RF-05 — dataFim anterior a dataInicio

```gherkin
Dado que dataInicio = "2026-04-10"
Quando o Analista enviar dataFim = "2026-04-09"
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "dataFim deve ser posterior a dataInicio"
```

### RF-07 — Suspender licença ATIVA

```gherkin
Dado que existe uma licença com status ATIVA
Quando o Analista chamar POST /api/v1/licencas/{id}/suspender
  Com body { "justificativa": "Pendência financeira identificada" }
Então o sistema deve retornar HTTP 200
  E o status da licença deve ser SUSPENSA
  E um registro de histórico deve ser criado com statusAnterior=ATIVA, statusNovo=SUSPENSA
```

### RF-09 — Tentar encerrar licença ATIVA

```gherkin
Dado que existe uma licença com status ATIVA
Quando o Analista chamar POST /api/v1/licencas/{id}/encerrar
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "Somente licenças SUSPENSAS podem ser encerradas. Suspenda a licença antes de encerrá-la."
```

### RF-12 — Licença ENCERRADA é imutável

```gherkin
Dado que existe uma licença com status ENCERRADA
Quando o Analista tentar suspender, reativar ou encerrar a licença
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "Licença já está ENCERRADA. Esta transição não é permitida."
```

---

## 6. Requisitos Não-Funcionais

| Requisito | Descrição |
|---|---|
| Autenticação | JWT Bearer via Keycloak (PKCE). Sem token = 401 |
| Autorização | Roles: `analista-arrecadacao` (R+W), `consultor-arrecadacao` (somente leitura) |
| Auditoria | Todo histórico de status registra `autor` do JWT — sem campo manual |
| Integridade referencial | FK para `usuario_musica` e `rubrica` no schema `arrecadacao` |
| Imutabilidade | `usuarioMusicaId` e `rubricaId` não podem ser alterados após a criação |
| Performance | Listagem deve responder em < 500ms para até 10.000 licenças |
| Consistência | `criadoEm` e `atualizadoEm` gerenciados pelo backend (não aceitar no request body) |

---

## 7. Regras de Negócio Consolidadas

| ID | Regra |
|----|-------|
| RN-01 | Status inicial de licença criada = ATIVA |
| RN-02 | Transições válidas: ATIVA↔SUSPENSA, SUSPENSA→ENCERRADA |
| RN-03 | ATIVA → ENCERRADA diretamente é proibida |
| RN-04 | ENCERRADA é estado terminal — sem transições de saída |
| RN-05 | Usuário INATIVO não recebe nova licença |
| RN-06 | dataInicio >= data atual |
| RN-07 | dataFim > dataInicio (se informada) |
| RN-08 | Múltiplas licenças simultâneas para o mesmo par Usuário+Rubrica são permitidas |
| RN-09 | Suspensão, reativação e encerramento exigem justificativa (mínimo 10 caracteres) |
| RN-10 | Toda transição de status gera registro imutável no histórico |
| RN-11 | SUSPENSA pode receber pagamentos (F04) |
| RN-12 | `usuarioMusicaId` e `rubricaId` são imutáveis após criação |

---

## 8. Modelo de Dados (Orientativo)

```sql
-- Schema: arrecadacao

CREATE TABLE licenca (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_musica_id UUID NOT NULL REFERENCES usuario_musica(id),
    rubrica_id    UUID NOT NULL REFERENCES rubrica(id),
    data_inicio   DATE NOT NULL,
    data_fim      DATE NULL,       -- NULL = vigência indefinida
    status        VARCHAR(20) NOT NULL DEFAULT 'ATIVA'
                  CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE historico_status_licenca (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    licenca_id      UUID NOT NULL REFERENCES licenca(id),
    status_anterior VARCHAR(20) NULL,
    status_novo     VARCHAR(20) NOT NULL,
    justificativa   TEXT NOT NULL,
    autor           VARCHAR(200) NOT NULL,
    data            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices sugeridos
CREATE INDEX idx_licenca_usuario_musica_id ON licenca(usuario_musica_id);
CREATE INDEX idx_licenca_rubrica_id ON licenca(rubrica_id);
CREATE INDEX idx_licenca_status ON licenca(status);
CREATE INDEX idx_licenca_data_inicio ON licenca(data_inicio DESC);
CREATE INDEX idx_historico_status_licenca_licenca_id ON historico_status_licenca(licenca_id);
```

---

## 9. Restrições Técnicas

| Restrição | Decisão |
|---|---|
| Runtime | Java 21, Spring Boot 3.x |
| Banco de dados | PostgreSQL, schema `arrecadacao` |
| Autenticação | Keycloak externo, JWT PKCE |
| Serialização | camelCase no JSON |
| Erros | RFC 7807 ProblemDetails |
| IDs | UUID v4 gerado pelo banco |

---

## 10. Non-Goals (Fora do Escopo desta Feature)

- Cálculo automático de valor da licença
- Renovação automática de licença com dataFim vencida
- Notificações automáticas de vencimento
- Encerramento automático ao atingir dataFim
- Fluxo de aprovação de licença (somente criação direta por Analista)
- Registro de pagamentos (F04)
- Cálculo de verba líquida (F05)
- Interface de seleção de licença no pagamento (F04)

---

## 11. Premissas de UX / Frontend

| Decisão | Justificativa |
|---|---|
| Badge de status: ATIVA (verde), SUSPENSA (amarelo), ENCERRADA (cinza) | Consistência visual com F02 |
| Botões de transição visíveis somente ao Analista | Controle de acesso por role no frontend |
| Modal de confirmação com textarea para justificativa (mín. 10 chars) | Padrão F02 — inativar/ativar |
| Filtro `vigente` como toggle boolean | Caso de uso frequente: "mostrar apenas as vigentes" |
| dataInicio com date picker que bloqueia datas passadas | Consistência com RF-04 |
| Histórico como timeline na aba de detalhes da licença | Padrão F02 — historico-status |
