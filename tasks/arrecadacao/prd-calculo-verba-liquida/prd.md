# PRD — F05: Cálculo e Disponibilização de Verba Líquida

> **Domínio:** Arrecadação (D03)
> **Feature ID:** F05
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-05

---

## Visão Geral

Verba é o agregado financeiro que transforma pagamentos individuais em receita calculada por rubrica e período mensal. No mini-ECAD, a verba líquida é o resultado final da arrecadação — é ela que a Distribuição (D04) consome para calcular créditos aos titulares.

O cálculo segue a regra do Regulamento de Distribuição: do valor bruto arrecadado, deduz-se 10% para o ECAD e 5% para as associações, resultando em 85% de verba líquida. Este cálculo é materializado em uma tabela dedicada e recalculado incrementalmente a cada pagamento confirmado ou estorno, publicando evento para a Distribuição consumir.

A verba possui ciclo de status que garante integridade durante o processo de distribuição: enquanto a Distribuição estiver em andamento para uma rubrica+período, nenhum pagamento ou estorno pode alterar a verba correspondente.

**Problema:** Sem verba calculada, a Distribuição não sabe quanto dinheiro existe por rubrica e período para distribuir aos titulares — o fluxo entre arrecadação e distribuição fica desconectado.

**Solução:** Agregado materializado de verba por rubrica+período com cálculo automático (85% do bruto), publicação incremental de evento para Distribuição, lock durante processo de distribuição e tela de acompanhamento com visão detalhada e agregada.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Cálculo correto de verba líquida | 100% das verbas com líquida = bruto × 0.85 (deduções 10% + 5%) |
| Recálculo incremental | Verba recalculada em menos de 1 segundo após cada pagamento/estorno |
| Evento publicado para Distribuição | 100% dos recálculos geram evento `arrecadacao.verba.disponivel` |
| Lock durante distribuição | Zero alterações de verba enquanto EM_DISTRIBUICAO ou DISTRIBUIDA |
| Tela de acompanhamento funcional | Analista visualiza verbas por rubrica×período e por rubrica com drill-down |

---

## Histórias de Usuário

### HU-01 — Cálculo automático ao registrar pagamento
**Como** sistema,
**eu quero** que ao registrar um pagamento confirmado, a verba da rubrica+período correspondente seja recalculada automaticamente,
**para que** a receita arrecadada esteja sempre atualizada e disponível para distribuição.

### HU-02 — Recálculo automático ao estornar pagamento
**Como** sistema,
**eu quero** que ao estornar um pagamento, a verba da rubrica+período correspondente seja recalculada subtraindo o valor estornado,
**para que** a verba líquida reflita apenas pagamentos confirmados.

### HU-03 — Acompanhar verbas por rubrica×período
**Como** Analista ou Consultor de Arrecadação,
**eu quero** visualizar uma tabela detalhada de verbas por rubrica e período com valor bruto, deduções e verba líquida,
**para que** eu acompanhe a arrecadação mensal por segmento.

### HU-04 — Acompanhar verbas por rubrica (agregado)
**Como** Analista ou Consultor de Arrecadação,
**eu quero** visualizar totais acumulados por rubrica (soma de todos os períodos) com drill-down para ver cada período,
**para que** eu tenha uma visão consolidada da arrecadação por segmento.

### HU-05 — Visualizar status da verba
**Como** Analista de Arrecadação,
**eu quero** ver o status de cada verba (ABERTA, EM_DISTRIBUICAO, DISTRIBUIDA),
**para que** eu saiba se posso registrar pagamentos ou se a verba está travada para distribuição.

---

## Funcionalidades Principais

### 1. Cálculo de Verba Líquida

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Manter entidade Verba materializada no banco com: rubrica (FK), período (YYYY-MM), valorBrutoTotal, deducaoEcad (10%), deducaoAssociacoes (5%), verbaLiquida (85%), status, contagem de pagamentos | Must Have |
| RF-02 | Unicidade: uma verba por rubrica×período (constraint unique) | Must Have |
| RF-03 | Ao registrar pagamento (F04), recalcular a verba da rubrica+período: somar todos os pagamentos CONFIRMADOS da rubrica+período, aplicar deduções, atualizar verba | Must Have |
| RF-04 | Ao estornar pagamento (F06), recalcular a verba da rubrica+período: somar apenas pagamentos CONFIRMADOS (excluindo estornados), aplicar deduções, atualizar verba | Must Have |
| RF-05 | Fórmula de cálculo: deducaoEcad = valorBrutoTotal × 0.10; deducaoAssociacoes = valorBrutoTotal × 0.05; verbaLiquida = valorBrutoTotal - deducaoEcad - deducaoAssociacoes (= valorBrutoTotal × 0.85) | Must Have |
| RF-06 | Se não existir verba para a rubrica+período no momento do primeiro pagamento, criar o registro com os valores calculados | Must Have |
| RF-07 | Se todos os pagamentos de uma rubrica+período forem estornados, a verba permanece com valor zero (não é excluída) | Must Have |
| RF-08 | Valores monetários em tipos decimais de alta precisão (RN-06). Nunca float/double | Must Have |

**Critérios de Aceitação — RF-03:**
- **Given** existem 3 pagamentos CONFIRMADOS na rubrica RADIO período 2026-04 (5 UDAs, 3 UDAs, 2 UDAs) com UDA = R$ 107,31
- **When** o sistema recalcula a verba
- **Then** valorBrutoTotal = R$ 1.073,10; deducaoEcad = R$ 107,31; deducaoAssociacoes = R$ 53,66; verbaLiquida = R$ 912,13

**Critérios de Aceitação — RF-05:**
- **Given** uma verba com valorBrutoTotal = R$ 1.000,00
- **When** o cálculo é executado
- **Then** deducaoEcad = R$ 100,00; deducaoAssociacoes = R$ 50,00; verbaLiquida = R$ 850,00

**Critérios de Aceitação — RF-07:**
- **Given** uma verba com 1 pagamento CONFIRMADO de R$ 500,00
- **When** esse pagamento é estornado
- **Then** a verba permanece com valorBrutoTotal = R$ 0,00; verbaLiquida = R$ 0,00 (registro não excluído)

### 2. Publicação de Evento

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-09 | A cada recálculo de verba (pagamento ou estorno), publicar evento `arrecadacao.verba.disponivel` via Outbox Pattern contendo: rubricaSigla, rubricaNome, periodo, valorBrutoTotal, deducaoEcad, deducaoAssociacoes, verbaLiquida, quantidadePagamentos, status | Must Have |
| RF-10 | O evento é publicado mesmo quando a verba é zero (ex: após estorno total) — Distribuição precisa saber que a verba foi zerada | Must Have |
| RF-11 | Formato do evento: CloudEvents 1.0, type = `arrecadacao.verba.disponivel`, subject = `{rubricaSigla}:{periodo}` | Must Have |

**Critérios de Aceitação — RF-09:**
- **Given** um pagamento é registrado na rubrica RADIO período 2026-04
- **When** a verba é recalculada
- **Then** um evento `arrecadacao.verba.disponivel` é publicado via Outbox com os valores atualizados

**Critérios de Aceitação — RF-10:**
- **Given** o último pagamento de uma rubrica+período é estornado
- **When** a verba é recalculada (bruto = 0, líquida = 0)
- **Then** o evento é publicado com valores zerados (não é suprimido)

### 3. Lock de Distribuição

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-12 | Verba possui status com ciclo: ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA. Status inicial = ABERTA | Must Have |
| RF-13 | Ao consumir evento `distribuicao.processo.iniciado` (rubrica+período), marcar a verba correspondente como EM_DISTRIBUICAO | Must Have |
| RF-14 | Ao consumir evento `distribuicao.processo.finalizado` (rubrica+período), marcar a verba correspondente como DISTRIBUIDA | Must Have |
| RF-15 | Enquanto a verba estiver EM_DISTRIBUICAO ou DISTRIBUIDA, rejeitar qualquer operação que altere seu valor (pagamento ou estorno na rubrica+período). Mensagem: "Verba da rubrica {sigla} período {periodo} está {status} e não pode ser alterada" | Must Have |
| RF-16 | A validação de lock deve ser executada ANTES do registro de pagamento (F04) e ANTES do estorno (F06) | Must Have |

**Critérios de Aceitação — RF-15:**
- **Given** a verba da rubrica RADIO período 2026-04 está EM_DISTRIBUICAO
- **When** o Analista tenta registrar pagamento na rubrica RADIO período 2026-04
- **Then** o pagamento é rejeitado com mensagem "Verba da rubrica RADIO período 2026-04 está EM_DISTRIBUICAO e não pode ser alterada"

**Critérios de Aceitação — RF-13:**
- **Given** existe verba ABERTA para rubrica RADIO período 2026-04
- **When** o sistema consome evento `distribuicao.processo.iniciado` para RADIO 2026-04
- **Then** o status da verba muda para EM_DISTRIBUICAO

### 4. Tela de Acompanhamento

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-17 | Visão detalhada: listagem paginada de verbas com colunas — rubrica (sigla/nome), período, valor bruto, dedução ECAD, dedução associações, verba líquida, qtd pagamentos, status | Must Have |
| RF-18 | Visão agregada por rubrica: uma linha por rubrica com soma de todos os períodos (bruto total, líquida total, qtd períodos). Drill-down para ver períodos individuais | Must Have |
| RF-19 | Filtros: rubrica (por sigla), período (YYYY-MM ou range), status (ABERTA/EM_DISTRIBUICAO/DISTRIBUIDA/todos) | Must Have |
| RF-20 | Ordenação padrão por período DESC na visão detalhada; por rubrica sigla na visão agregada | Should Have |
| RF-21 | Endpoint de busca de verba por rubrica+período retornando dados completos | Must Have |

**Critérios de Aceitação — RF-17:**
- **Given** existem verbas para 3 rubricas em 2 períodos
- **When** o usuário acessa a visão detalhada
- **Then** são exibidas 6 linhas (3 rubricas × 2 períodos) com todos os valores calculados

**Critérios de Aceitação — RF-18:**
- **Given** a rubrica RADIO tem verbas em 2026-03 (R$ 1.000) e 2026-04 (R$ 2.000)
- **When** o usuário acessa a visão agregada
- **Then** RADIO mostra bruto total = R$ 3.000, líquida total = R$ 2.550; clicando expande os 2 períodos

---

## Experiência do Usuário

### Fluxo — Acompanhamento de Verbas
1. Analista/Consultor acessa "Arrecadação" → "Verbas"
2. Toggle ou tabs para alternar entre "Por Rubrica×Período" (detalhada) e "Por Rubrica" (agregada)
3. Filtros no topo: rubrica (dropdown), período (seletor mês/ano ou range), status (dropdown)
4. Na visão agregada: clicar na linha da rubrica expande períodos (accordion ou sub-tabela)

### Considerações de UI
- Badge de status: ABERTA (verde), EM_DISTRIBUICAO (amarelo pulsante), DISTRIBUIDA (azul)
- Valores monetários formatados em R$ com 2 casas decimais
- Deduções exibidas entre parênteses ou em cor diferenciada (representam subtração)
- Visão agregada: totais em negrito, linha expansível com ícone de chevron
- Consultor e Analista têm acesso idêntico (apenas leitura — não há ações de escrita na tela de verbas)
- Verba com valor zero exibida normalmente (não ocultada)

---

## Restrições Técnicas de Alto Nível

- Stack Java Spring Boot (fundação F01)
- Schema `arrecadacao` no PostgreSQL
- Verba referencia Rubrica (UUID) — chave estrangeira
- Valores monetários em tipos decimais de alta precisão (RN-06)
- Evento `arrecadacao.verba.disponivel` via Outbox Pattern (CloudEvents 1.0)
- Consome eventos da Distribuição (`distribuicao.processo.iniciado`, `distribuicao.processo.finalizado`) — requer consumer RabbitMQ
- Lógica de cálculo compartilhada entre fluxo de pagamento (F04) e estorno (F06) — serviço reutilizável
- Unicidade rubrica+período garantida via constraint de banco

---

## Não-Objetivos (Fora de Escopo)

- Distribuição de créditos aos titulares (D04)
- Cálculo de split autoral (66,67%) / conexo (33,33%) — responsabilidade da Distribuição
- Geração de demonstrativos de pagamento
- Alteração manual de valores da verba pelo Analista (cálculo é 100% automático)
- Deduções variáveis por rubrica (percentuais fixos: 10% ECAD + 5% associações para todas)
- Fechamento de período (verba é incrementalmente recalculada, sem conceito de "fechar mês")
- Reversão de status DISTRIBUIDA → ABERTA (irreversível — se necessário, novo processo de distribuição)
- Estorno de pagamento (F06 — feature separada que invoca o recálculo desta feature)

---

## Rastreabilidade

### Vision Doc
- **Objetivo atendido:** Calcular verba líquida (dedução administrativa de 15% sobre o bruto) e disponibilizar para distribuição
- **Perfis:** Analista de Arrecadação (acompanhamento), Consultor de Arrecadação (consulta)
- **Glossário:** Verba Líquida — "Valor arrecadado após dedução dos percentuais administrativos (85% do valor bruto — 10% ECAD + 5% associações)"
- **Dependência cross-domain:** Distribuição (D04) consome evento `arrecadacao.verba.disponivel`
- **Restrição global:** PoC auto-contida; percentuais fixos (não variáveis por rubrica)

### Domain Doc (Arrecadação — D03)
- **Feature:** F05 — Cálculo e Disponibilização de Verba Líquida
- **Entidades:** Verba (principal — agregado materializado)
- **Regras referenciadas:** RN-01 (verba líquida = 85%), RN-02 (período mensal YYYY-MM), RN-06 (decimal alta precisão), RN-09 (evento incremental)
- **Eventos produzidos:** `arrecadacao.verba.disponivel`
- **Eventos consumidos:** `distribuicao.processo.iniciado`, `distribuicao.processo.finalizado` (novos — não estavam no Domain Doc, derivados do requisito de lock)
- **Dependências upstream:** F04 (Pagamentos — trigger de recálculo)
- **Dependências downstream:** F06 (Estorno — trigger de recálculo), D04 Distribuição (consome evento)
- **Ordem de implementação:** Quinta feature do domínio

---

## Questões em Aberto

Todas as questões foram resolvidas. PRD pronto para API Contract e Tech Spec.

---

*PRD gerado com a skill `flow-prd-creator`. Para gerar o contrato de API, use a skill `flow-contract-creator`. Para gerar a Especificação Técnica, use a skill `flow-techspec-creator`.*
