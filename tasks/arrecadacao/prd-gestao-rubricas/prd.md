# PRD — F06: Gestão de Rubricas

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F06
> **Prioridade:** Must Have
> **Status:** `done`
> **Data:** 2026-06-07

---

## 1. Visão Geral

Rubricas são os segmentos de utilização musical (Rádio, TV Aberta, Streaming, etc.) que estruturam todo o fluxo de arrecadação e distribuição de créditos. Atualmente, as rubricas existem como dados de referência seedados no banco (7 rubricas padrão), sem interface de gestão. O Analista de Arrecadação não consegue cadastrar novas rubricas nem inativar rubricas existentes.

Esta feature implementa o CRUD completo de Rubricas na Arrecadação com geração automática de sigla (com sugestão editável pelo usuário), controle de status ativo/inativo, e sincronização de alterações via eventos para o domínio Distribuição.

**Problema:** Sem capacidade de criar e gerenciar rubricas, o sistema fica limitado às 7 rubricas seedadas. Novos segmentos de utilização musical não podem ser incorporados ao fluxo de arrecadação.

**Solução:** CRUD completo com geração automática de sigla, inativação simples (impede novas licenças/pagamentos, preserva histórico), e eventos de sincronização para Distribuição.

---

## 2. Contexto e Rastreabilidade

| Referência | Documento | Item |
|---|---|---|
| Vision | `vision.md` | "Gerenciar rubricas de utilização musical" |
| Domain Doc | `docs/arrecadacao/domain.md` | F06, RN-08 |
| Upstream | F01 (Seed de Rubricas) | Rubricas seedadas como base |
| Downstream | F03 (Gestão de Licenças) | Licenças vinculadas a rubricas |
| Downstream | F04 (Registro de Pagamentos) | Pagamentos vinculados a licenças de rubricas |
| Downstream | F05 (Cálculo de Verba Líquida) | Verbas agregadas por rubrica |
| Downstream | D04 (Distribuição) | Sincronização de rubricas via eventos |

---

## 3. User Stories

| ID | Como | Quero | Para |
|----|------|-------|------|
| HU-01 | Analista de Arrecadação | Cadastrar uma nova rubrica informando nome e se exige classificação | Disponibilizar um novo segmento de utilização musical para licenciamento |
| HU-02 | Analista de Arrecadação | Editar o nome e o flag de exige classificação de uma rubrica existente | Corrigir informações desatualizadas |
| HU-03 | Analista de Arrecadação | Inativar uma rubrica ativa | Impedir que novas licenças e pagamentos sejam vinculados a essa rubrica |
| HU-04 | Analista de Arrecadação | Reativar uma rubrica inativada | Permitir que a rubrica volte a receber novas licenças |
| HU-05 | Analista ou Consultor | Listar todas as rubricas com status (ativa/inativa) | Visualizar o catálogo completo de segmentos de utilização musical |
| HU-06 | Analista ou Consultor | Visualizar os detalhes de uma rubrica específica | Consultar informações completas de um segmento |
| HU-07 | Sistema (automático) | Gerar uma sigla sugerida automaticamente a partir do nome | Agilizar o cadastro sem exigir que o usuário invente siglas |
| HU-08 | Analista de Arrecadação | Aceitar a sigla sugerida ou informar uma sigla manualmente | Ter controle sobre o identificador da rubrica |

---

## 4. Requisitos Funcionais

### 4.1 Criação de Rubrica

**RF-01 — Criar Rubrica**
O sistema deve permitir criar uma rubrica com `nome` obrigatório (mínimo 3 caracteres, máximo 100) e `exigeClassificacao` (boolean, default false).

**RF-02 — Geração automática de sigla**
Ao informar o nome, o sistema deve sugerir uma sigla automaticamente seguindo o algoritmo:
1. Converter para MAIÚSCULAS
2. Remover acentos
3. Remover caracteres especiais (manter letras, dígitos, espaço, hífen)
4. Tratar parênteses como separadores de palavra
5. Ignorar preposições e artigos: `DE`, `DA`, `DO`, `DAS`, `DOS`, `EM`, `NO`, `NA`, `A`, `O`, `E`, `PARA`, `POR`, `COM`
6. Para cada palavra restante, extrair a primeira letra
7. Juntar com underscore (`_`)
8. Se resultado < 3 caracteres, usar primeiras 3 letras da primeira palavra
9. Se resultado > 20 caracteres, truncar para 20
10. Verificar unicidade: se sigla já existe, exigir confirmação ou sigla manual

**RF-03 — Sigla única**
A sigla é única no sistema (constraint `uq_rubricas_sigla`). Tentativa de criar/editar com sigla duplicada retorna 409.

**RF-04 — Status inicial**
O status inicial de toda rubrica criada é **ATIVA** (`ativo = true`).

**RF-05 — Sigla editável pelo usuário**
O usuário pode aceitar a sigla sugerida ou informar uma sigla manualmente no momento da criação. A sigla não pode ser alterada após a criação.

### 4.2 Atualização de Rubrica

**RF-06 — Editar nome e exigeClassificacao**
É permitido editar o `nome` e o `exigeClassificacao` de uma rubrica existente. A sigla não é editável.

**RF-07 — Evento de atualização**
Toda atualização (nome ou exigeClassificacao) deve publicar o evento `arrecadacao.rubrica.atualizada` via Outbox Pattern para sincronização com Distribuição.

### 4.3 Inativação e Reativação

**RF-08 — Inativar rubrica**
Uma rubrica ATIVA pode ser inativada, mudando `ativo` para `false`. Requer justificativa (mínimo 10 caracteres).

**RF-09 — Reativar rubrica**
Uma rubrica INATIVA pode ser reativada, mudando `ativo` para `true`. Requer justificativa (mínimo 10 caracteres).

**RF-10 — Impedir nova licença em rubrica inativa**
Não deve ser possível criar uma Licença vinculada a uma rubrica inativa. Retorna 422.

**RF-11 — Impedir novo pagamento em rubrica inativa**
Não deve ser possível registrar um Pagamento para uma Licença cuja rubrica está inativa. Retorna 422.

**RF-12 — Preservar pagamentos existentes**
Pagamentos e verbas já existentes de uma rubrica inativa permanecem intactos. A inativação só impede **novos** registros.

**RF-13 — Evento de inativação/reativação**
Toda inativação ou reativação deve publicar o evento `arrecadacao.rubrica.atualizada` (com `ativo` no payload) via Outbox Pattern.

### 4.4 Listagem e Consulta

**RF-14 — Listar todas as rubricas**
Listagem retornando todas as rubricas (ativa e inativa) com: id, sigla, nome, exigeClassificacao, ativo.

**RF-15 — Ordenação**
Ordenação padrão por sigla (A-Z).

**RF-16 — Detalhe por ID**
Endpoint retornando dados completos de uma rubrica específica.

---

## 5. Critérios de Aceitação

### RF-02 — Geração automática de sigla

```gherkin
Dado que o Analista informa o nome "Rádio AM/FM"
Quando o sistema processa a geração de sigla
Então a sigla sugerida deve ser "RADIO"
```

```gherkin
Dado que o Analista informa o nome "TV Aberta"
Quando o sistema processa a geração de sigla
Então a sigla sugerida deve ser "TV_ABERTA"
```

```gherkin
Dado que o Analista informa o nome "Streaming de Áudio ao Vivo"
Quando o sistema processa a geração de sigla
Então a sigla sugerida deve ser "STREAMING_AUDIO_AO_VIVO"
```

```gherkin
Dado que já existe uma rubrica com sigla "RADIO"
Quando o sistema sugere "RADIO" para nova rubrica
Então deve exigir confirmação ou sigla manual
```

### RF-03 — Sigla duplicada

```gherkin
Dado que já existe uma rubrica com sigla "RADIO"
Quando o Analista tenta criar outra rubrica com sigla "RADIO"
Então o sistema deve retornar HTTP 409
  E a mensagem deve conter "Sigla já cadastrada"
```

### RF-08 — Inativar rubrica

```gherkin
Dado que existe uma rubrica ATIVA
Quando o Analista chama POST /api/v1/rubricas/{id}/inativar
  Com body { "justificativa": "Segmento obsoleto, substituído por novo formato" }
Então o sistema deve retornar HTTP 200
  E o status da rubrica deve ser INATIVA
```

### RF-10 — Impedir licença em rubrica inativa

```gherkin
Dado que existe uma rubrica INATIVA
Quando o Analista tenta criar uma licença para esta rubrica
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "Rubrica está inativa e não pode receber novas licenças"
```

### RF-11 — Impedir pagamento em rubrica inativa

```gherkin
Dado que existe uma licença vinculada a uma rubrica INATIVA
Quando o Analista tenta registrar um pagamento para esta licença
Então o sistema deve retornar HTTP 422
  E a mensagem deve conter "Rubrica está inativa e não permite novos pagamentos"
```

---

## 6. Requisitos Não-Funcionais

| Requisito | Descrição |
|---|---|
| Autenticação | JWT Bearer via Keycloak (PKCE). Sem token = 401 |
| Autorização | Permissões dedicadas: `rubrica:criar`, `rubrica:editar`, `rubrica:inativar`, `rubrica:visualizar` |
| Auditoria | Inativação/reativação registra justificativa e autor no histórico (padrão F02/F03) |
| Eventos | Toda mutação publica `arrecadacao.rubrica.atualizada` via Outbox Pattern |
| Consistência | Sincronização com Distribuição via eventos RabbitMQ (at-least-once) |
| Performance | Listagem deve responder em < 200ms (volume pequeno, < 100 rubricas) |
| Imutabilidade | `sigla` não pode ser alterada após a criação |

---

## 7. Regras de Negócio Consolidadas

| ID | Regra |
|----|-------|
| RN-01 | Status inicial de rubrica criada = ATIVA |
| RN-02 | Sigla é imutável após criação |
| RN-03 | Sigla é única no sistema |
| RN-04 | Nome deve ter entre 3 e 100 caracteres |
| RN-05 | Inativação e reativação exigem justificativa (mínimo 10 caracteres) |
| RN-06 | Rubrica INATIVA não recebe novas licenças |
| RN-07 | Rubrica INATIVA não recebe novos pagamentos |
| RN-08 | Pagamentos e verbas existentes de rubrica inativa são preservados |
| RN-09 | Reativação não reativa licenças encerradas automaticamente |
| RN-10 | Toda mutação (criação, atualização, inativação, reativação) publica evento de sincronização |

---

## 8. Modelo de Dados (Orientativo)

```sql
-- Schema: arrecadacao

-- Migration para adicionar campo ativo
ALTER TABLE rubricas ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_rubricas_ativo ON rubricas(ativo);
```

**Entidade Rubrica (atualizada):**

| Campo | Tipo | Restrições |
|-------|------|-----------|
| id | UUID | PK |
| sigla | VARCHAR(20) | NOT NULL, UNIQUE |
| nome | VARCHAR(100) | NOT NULL |
| exige_classificacao | BOOLEAN | NOT NULL, DEFAULT FALSE |
| ativo | BOOLEAN | NOT NULL, DEFAULT TRUE |

---

## 9. Restrições Técnicas

| Restrição | Decisão |
|---|---|
| Runtime | Java 21, Spring Boot 3.x |
| Banco de dados | PostgreSQL, schema `arrecadacao` |
| Autenticação | Keycloak externo, JWT PKCE |
| Serialização | camelCase no JSON |
| Erros | RFC 7807 ProblemDetails |
| IDs | UUID v4 gerado pela aplicação |
| Eventos | CloudEvents 1.0 via Outbox Pattern |

---

## 10. Non-Goals (Fora do Escopo desta Feature)

- Exclusão física de rubricas
- Movimentação de pagamentos entre rubricas
- Histórico de alterações de nome/exigeClassificacao (audit trail completo de campo a campo)
- Processamento assíncrono em background para inativação
- Notificações automáticas de inativação
- Relatórios de rubricas inativas
- Importação em lote de rubricas
- Duplicação de rubrica (clone)

---

## 11. Premissas de UX / Frontend

| Decisão | Justificativa |
|---|---|
| Badge de status: ATIVA (verde), INATIVA (cinza) | Consistência visual com F02/F03 |
| Sigla exibida em destaque (coluna principal) | Identificador natural da rubrica |
| Formulário de criação com campo nome + checkbox exigeClassificacao | Campos mínimos necessários |
| Sugestão de sigla aparece abaixo do nome, editável | Usuário vê a sugestão em tempo real |
| Modal de confirmação para inativação com textarea justificativa | Padrão F02/F03 |
| Listagem mostra todas as rubricas (ativas e inativas) com filtro por status | Visibilidade completa do catálogo |
| Rubricas inativas aparecem com opacidade reduzida na tabela | Diferenciação visual |
| Consultor não vê botões de ação (Novo, Editar, Inativar/Reativar) | Controle de acesso por permissão |

---

## 12. Algoritmo de Geração de Sigla

### Passo a passo

```
Entrada: nome da rubrica (string)
Saída: sigla sugerida (string)

1. nome = nome.toUpperCase()
2. nome = removeAcentos(nome)
3. nome = removeCaracteresEspeciaisExcetoEspacoEHifen(nome)
4. nome = trataParentesesComoSeparadores(nome)
5. palavras = split(nome, /[\s\-_]+/)
6. palavrasSignificativas = filtrar(palavras, p => p not in [
     'DE','DA','DO','DAS','DOS','EM','NO','NA','A','O','E','PARA','POR','COM'
   ])
7. se palavrasSignificativas.isEmpty():
     palavrasSignificativas = palavras  // fallback, usa todas
8. sigla = palavrasSignificativas.map(p => p.charAt(0)).join('_')
9. se sigla.length < 3:
     sigla = primeiras3Letras(primeiraPalavra)
10. se sigla.length > 20:
      sigla = sigla.substring(0, 20)
11. retornar sigla
```

### Exemplos

| Nome | Sigla Sugerida |
|------|---------------|
| Rádio | `RADIO` |
| TV Aberta | `TV_ABERTA` |
| Streaming Vídeo (VOD) | `STREAMING_VIDEO_VOD` |
| Cinema | `CINEMA` |
| Show ao Vivo | `SHOW_AO_VIVO` |
| Web | `WEB` |

---

## 13. Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Gerenciar catálogo de rubricas de utilização musical
- **Perfis:** Analista de Arrecadação, Consultor de Arrecadação
- **Glossário:** Rubrica — "Segmento de utilização musical: Rádio AM/FM, TV Aberta, TV Fechada, Streaming, Show, Cinema"

### Domain Doc (Arrecadação — D03)
- **Feature:** F06 — Gestão de Rubricas
- **Entidades:** Rubrica (id, sigla, nome, exigeClassificacao, ativo)
- **Regras referenciadas:** RN-08 (Rubrica é dado de referência), RN-09 (inativação impede novos vínculos)
- **Dependências upstream:** F01 (Seed de Rubricas) como base
- **Dependências downstream:** F03 (Licenças), F04 (Pagamentos), F05 (Verba), D04 (Distribuição — sincronização)

### Domain Doc (Distribuição — D04)
- **Eventos consumidos:** `arrecadacao.rubrica.atualizada` (payload: sigla, nome, exigeClassificacao, ativo)
- **Impacto:** Entidade `Rubrica` no schema `distribuicao` recebe campo `ativo`

---

## 14. Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para implementação.

---

*PRD gerado com análise manual do codebase. TechSpec e Tasks disponíveis em `tasks/arrecadacao/prd-gestao-rubricas/`.*
