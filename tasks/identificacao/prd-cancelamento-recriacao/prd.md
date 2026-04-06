# PRD — F06: Cancelamento e Recriação

> **Domínio:** Identificação (D02)
> **Feature:** F06 — Cancelamento e Recriação
> **Prioridade:** Must Have
> **Status:** `planned`
> **Última revisão:** 2026-04-04

---

## 1. Visão Geral

Após o fechamento de um Rol (F05), pode ser necessário cancelá-lo por erro na captação, execuções incorretas ou reclassificação. Como não há reabertura (RN-05), a única forma de corrigir é cancelar o Rol existente e, opcionalmente, recriar uma nova captação para o mesmo período.

O cancelamento publica o evento `identificacao.rol.cancelado` para que a Distribuição invalide qualquer snapshot baseado no Rol anterior. Porém, se a Distribuição já processou o Rol (`distribuicao.rol.processado`), o cancelamento é bloqueado — não é possível desfazer uma distribuição já calculada.

Ao cancelar, o sistema oferece ao analista três opções de recriação: copiar execuções, recriar vazia ou apenas cancelar.

---

## 2. Objetivos

| Objetivo | Métrica de Sucesso |
|---|---|
| Cancelamento seguro | 100% dos cancelamentos geram evento `identificacao.rol.cancelado` |
| Bloqueio pós-distribuição | 0% de cancelamentos em Rols já processados pela Distribuição |
| Rastreabilidade | 100% dos cancelamentos com justificativa registrada |
| Recriação eficiente | Analista escolhe entre copiar execuções, recriar vazia ou cancelar sem recriação |

---

## 3. Usuários e Papéis

| Perfil | Permissões nesta feature |
|---|---|
| Analista de Identificação | Cancelar Rols fechados que são seus (RN-08). Escolher opção de recriação |
| Consultor de Identificação | Visualizar status e justificativa de cancelamento. Sem permissão de ação |

---

## 4. Requisitos Funcionais

### RF-01 — Cancelar Rol fechado

**Descrição:** O Analista dono cancela uma captação FECHADA, informando justificativa obrigatória. O status transiciona para CANCELADA.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação FECHADA, analista é dono | Preenche justificativa e confirma cancelamento | Status → CANCELADA. Justificativa e data de cancelamento registradas |
| 2 | Justificativa em branco | Tenta confirmar | Sistema rejeita: "Justificativa é obrigatória" |
| 3 | Analista NÃO é dono | Tenta cancelar | Ação não disponível (RN-08) |
| 4 | Captação ABERTA | Tenta cancelar | Ação não disponível — cancelamento só se aplica a FECHADAS (para ABERTAS, usar exclusão da F01) |
| 5 | Captação já CANCELADA | Tenta cancelar | Ação não disponível |
| 6 | Distribuição já processou o Rol (`distribuicaoProcessada = true`) | Analista tenta cancelar | Ação bloqueada: "Este Rol já foi processado pela Distribuição e não pode ser cancelado" |

**Regras aplicáveis:** RN-05, RN-08

**Prioridade:** Must Have

---

### RF-02 — Publicar evento `identificacao.rol.cancelado`

**Descrição:** Ao cancelar, o sistema publica evento via Outbox Pattern para a Distribuição invalidar qualquer snapshot.

**Payload do evento:**

| Campo | Tipo | Descrição |
|---|---|---|
| `captacaoId` | UUID | ID da captação cancelada |
| `rubrica` | string | Sigla da rubrica |
| `periodo` | date | Data da captação |
| `canceladoEm` | datetime | Momento do cancelamento (UTC) |
| `analistaId` | UUID | Analista que cancelou |
| `justificativa` | string | Motivo do cancelamento |

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação cancelada com sucesso | Sistema processa | Evento `identificacao.rol.cancelado` salvo na tabela outbox |
| 2 | Outbox Worker processa | Evento pendente | Publicado no RabbitMQ com routing key `identificacao.rol.cancelado` |
| 3 | RabbitMQ indisponível | Worker tenta publicar | Retry (até 10 tentativas) |

**Regras aplicáveis:** RN-11

**Prioridade:** Must Have

---

### RF-03 — Opções de recriação

**Descrição:** Após confirmar o cancelamento, o sistema oferece ao analista três opções para a nova captação.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Cancelamento confirmado | Sistema exibe opções | Modal com 3 opções: (A) Recriar com execuções, (B) Recriar vazia, (C) Apenas cancelar |
| 2 | Analista escolhe **A — Recriar com execuções** | Confirma | Nova captação ABERTA criada para mesma rubrica+período. Todas as execuções da captação cancelada são copiadas (novos IDs, mesmos dados). Analista redirecionado para detalhe da nova captação |
| 3 | Analista escolhe **B — Recriar vazia** | Confirma | Nova captação ABERTA criada para mesma rubrica+período. Sem execuções. Analista redirecionado para detalhe da nova captação |
| 4 | Analista escolhe **C — Apenas cancelar** | Confirma | Nenhuma nova captação criada. Analista retorna à listagem de captações |
| 5 | Opção A — execuções copiadas | Nova captação criada | Status das execuções copiadas é recalculado (consulta Cadastro) — podem estar IDENTIFICADAS ou PENDENTES dependendo do estado atual |
| 6 | Opção A ou B — unicidade (RN-01) | Já existe outra captação não-cancelada para mesma rubrica+período | Não deve acontecer (a captação original acabou de ser cancelada). Se por race condition acontecer, erro: "Já existe captação ativa para este período" |

**Regras aplicáveis:** RN-01, RN-05

**Prioridade:** Must Have

---

### RF-04 — Consumir evento `distribuicao.rol.processado`

**Descrição:** A Identificação passa a consumir um evento da Distribuição que indica que o Rol foi usado no cálculo de créditos. Ao receber, marca a captação como processada, bloqueando cancelamento.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Evento `distribuicao.rol.processado` recebido com `captacaoId` | Sistema processa | Campo `distribuicaoProcessada` da captação → `true`. Data de processamento registrada |
| 2 | Captação com `distribuicaoProcessada = true` | Analista tenta cancelar | Bloqueado (RF-01 critério 6) |
| 3 | Evento com `captacaoId` inexistente | Sistema processa | Evento ignorado (log warning) |
| 4 | Evento duplicado (idempotência) | Mesmo evento recebido 2x | Segunda vez ignorada — já está marcada como processada |

**Prioridade:** Must Have

---

### RF-05 — Feedback visual no frontend

**Descrição:** Botão "Cancelar Rol" na CaptacaoDetailPage com modal de justificativa + opções de recriação.

**Critérios de Aceitação:**

| # | Given | When | Then |
|---|---|---|---|
| 1 | Captação FECHADA, analista é dono, não processada pela Distribuição | Acessa detalhe | Botão "Cancelar Rol" visível (variante danger) |
| 2 | Captação FECHADA, `distribuicaoProcessada = true` | Acessa detalhe | Botão "Cancelar Rol" desabilitado com tooltip: "Rol já processado pela Distribuição" |
| 3 | Analista clica "Cancelar Rol" | Modal abre | Campo de justificativa (textarea, obrigatório) + botão "Cancelar Rol" (danger) |
| 4 | Confirma cancelamento | Modal de opções | Exibe 3 opções de recriação (A/B/C) |
| 5 | Cancelamento concluído | Toast | "Rol cancelado com sucesso" + redirecionamento conforme opção escolhida |
| 6 | Consultor acessa | Detalhe de captação FECHADA | Botão "Cancelar Rol" não visível |
| 7 | Captação CANCELADA | Detalhe | Exibe banner com justificativa do cancelamento e data |

**Prioridade:** Must Have

---

## 5. Não-Objetivos (Fora de Escopo)

- **Reabertura de Rol** → não existe no sistema (RN-05)
- **Cancelamento de Rol já processado pela Distribuição** → bloqueado
- **Reversão do cancelamento** → uma vez cancelada, não pode ser "descancelada"
- **Cancelamento parcial** (cancelar apenas algumas execuções) → cancela o Rol inteiro
- **Recálculo automático da Distribuição** após cancelamento → Distribuição trata via evento
- **Histórico de cancelamentos** como tela separada → justificativa e data visíveis no detalhe da captação

---

## 6. Restrições Técnicas de Alto Nível

- **Outbox Pattern:** mesmo padrão do Cadastro e F05 — evento na mesma transação do cancelamento
- **Consumer RabbitMQ:** primeira vez que a Identificação consome um evento — `distribuicao.rol.processado`
- **Novo campo na entidade Captação:** `distribuicaoProcessada` (bool, default false) + `distribuicaoProcessadaEm` (datetime?)
- **Cópia de execuções (opção A):** nova captação com novos IDs — não é referência à antiga
- **Atomicidade:** cancelamento + evento outbox + criação da nova captação (opções A/B) na mesma transação

---

## 7. Riscos e Premissas

### Premissas
- O Outbox Pattern (F05) já estará implementado quando F06 for desenvolvida
- O evento `distribuicao.rol.processado` será definido no Domain Doc da Distribuição — para a PoC, a Identificação já prepara o consumer
- A cópia de execuções (opção A) reconsulta o Cadastro para recalcular status — pode haver mudanças desde o fechamento original

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cópia de 10.000 execuções pode ser lenta | Média | Médio | Processar em batch (mesmo padrão do CsvProcessorWorker F03) ou copiar como PENDENTE e re-verificar async |
| Race condition: analista cancela enquanto Distribuição processa | Baixa | Alto | Evento `identificacao.rol.cancelado` publicado — Distribuição deve tratar. Se `distribuicao.rol.processado` chegar depois, ignora (captação já cancelada) |
| Consumer de RabbitMQ é padrão novo no serviço de Identificação | Média | Médio | Seguir padrão do consumer de Analytics (se existir) ou implementar consumer genérico |

---

## 8. Rastreabilidade

### Vision Doc
- **Fase:** 2 — Identificação + Arrecadação
- **Domínio:** D02 — Identificação

### Domain Doc (`domains/identificacao/domain.md`)
- **Feature:** F06 — Cancelamento e Recriação
- **Regras de negócio:** RN-01 (unicidade), RN-05 (sem reabertura), RN-08 (propriedade), RN-11 (evento de cancelamento)
- **Evento produzido:** `identificacao.rol.cancelado`
- **Evento consumido (novo):** `distribuicao.rol.processado`
- **Atualização necessária no Domain Doc:** seção "Consome" + novo campo na entidade Captação

---

## 9. Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e TechSpec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o API Contract, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
