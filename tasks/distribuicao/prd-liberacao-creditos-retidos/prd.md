# PRD — F05: Liberação de Créditos Retidos

> **Domínio:** Distribuição (D04)
> **Feature ID:** F05
> **Prioridade:** Must Have
> **Status:** `implemented`
> **Data:** 2026-05-17
> **Revisão:** 2026-05-17 — implementado no backend `distribuicao-api` e na tela de cálculo do frontend; criado originalmente a partir do `vision.md`, do `domains/distribuicao/domain.md`, do PRD F04 `tasks/distribuicao/prd-retencao-creditos/prd.md` e do padrão estrutural de `tasks/cadastro/prd-eventos-cadastro/prd.md`.

---

## Status de Implementação

Implementação concluída em 2026-05-17.

Escopo implementado:

- seleção automática de créditos `RETIDO` de processos `FINALIZADO` anteriores da mesma rubrica;
- reavaliação cadastral em batch via ownership snapshot;
- criação de liberações `PREVISTA` durante o cálculo;
- efetivação na finalização com transição do crédito original para `LIBERADO`;
- cancelamento de liberações previstas quando o processo é cancelado;
- persistência de `CreditoLiberacao`, `CreditoRetidoReavaliacao`, `liberado_em` e `processo_liberacao_id`;
- evento `distribuicao.credito.liberado` via outbox;
- totais e seção de retidos liberados no contrato de cálculo;
- UI de retidos a liberar/liberados na tela de cálculo.

Verificações executadas:

- `rtk mvn -pl distribuicao-tests -am -DskipTests compile`;
- testes backend unitários de handlers, query de cálculo e `CreditoRetidoLiberacaoServiceTest`;
- `rtk npm run build`;
- testes frontend de resumo, filtros, tabela de créditos, tabela de retidos liberados, página de cálculo e formatadores.

## Visão Geral

Liberação de Créditos Retidos é a feature que completa o ciclo iniciado pela F04. A F04 classifica créditos como `RETIDO` quando há pendência cadastral — obra `PENDENTE`/`BLOQUEADA` ou titular sem associação. A F05 reavalia esses créditos em um processo de distribuição futuro e libera os valores quando as pendências tiverem sido resolvidas no Cadastro.

A liberação é automática e acontece no fluxo normal do Processo de Distribuição. Ao calcular um novo processo, o sistema identifica créditos retidos de processos finalizados anteriores da mesma rubrica, consulta o Cadastro em batch e marca os créditos elegíveis como "a liberar" no processo atual. A liberação só se torna efetiva na finalização do processo atual; se o processo for cancelado antes disso, os créditos permanecem retidos.

O valor liberado é o valor originalmente calculado e retido. A F05 não recalcula percentuais, não consome verba líquida do processo atual e não altera a memória monetária do processo de origem. Ela apenas muda a disponibilidade do crédito e registra em qual processo a liberação ocorreu.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Liberar automaticamente créditos retidos quando pendências cadastrais forem resolvidas | 100% dos créditos retidos elegíveis são vinculados ao novo processo como liberação prevista |
| Garantir que cancelamento do processo não libere valores indevidamente | 0 créditos efetivados quando o processo de liberação é cancelado |
| Preservar rastreabilidade ponta a ponta | Todo crédito liberado mantém processo de origem, motivo original, data de retenção, processo de liberação e data de liberação |
| Não recalcular valores históricos | Valor liberado é sempre igual ao `valorCredito` original do crédito retido |
| Publicar evento de liberação | Todo crédito efetivamente liberado gera `distribuicao.credito.liberado` via Outbox Pattern |
| Preparar demonstrativo futuro | Dados de retidos liberados ficam disponíveis para F07 incluir no demonstrativo do titular |

---

## Histórias de Usuário

### HU-01 — Sistema identifica retidos elegíveis
**Como** sistema de Distribuição,
**eu preciso** consultar créditos retidos de processos finalizados anteriores e reavaliar suas pendências no Cadastro,
**para que** valores já calculados possam ser liberados quando obra e titular estiverem regularizados.

### HU-02 — Analista visualiza retidos a liberar
**Como** Analista de Distribuição,
**eu quero** ver no cálculo do processo quantos créditos retidos serão liberados e qual valor total representam,
**para que** eu possa revisar o impacto antes de aprovar e finalizar o processo.

### HU-03 — Finalização efetiva a liberação
**Como** Analista de Distribuição,
**eu preciso** que a liberação só seja efetivada ao finalizar o processo,
**para que** um processo calculado ou aprovado, mas depois cancelado, não movimente créditos históricos.

### HU-04 — Cancelamento preserva retenções
**Como** Analista de Distribuição,
**eu preciso** poder cancelar um processo com liberações previstas sem liberar os créditos,
**para que** um erro no processo atual não altere créditos retidos de períodos anteriores.

### HU-05 — Titular enxerga valores liberados no demonstrativo futuro
**Como** titular,
**eu preciso** que créditos retidos liberados sejam rastreados com processo de origem e processo de liberação,
**para que** meu demonstrativo detalhe valores atuais e valores retidos de períodos anteriores.

### HU-06 — Analytics recebe evento de crédito liberado
**Como** consumidor analítico futuro,
**eu preciso** receber eventos de créditos liberados,
**para que** dashboards acompanhem valor retido, valor liberado, tempo médio de retenção e motivo original.

---

## Funcionalidades Principais

### 1. Seleção de Créditos Retidos Candidatos

Ao calcular um processo, a Distribuição deve buscar créditos retidos que podem ser avaliados para liberação. Para o MVP, a seleção é limitada a processos finalizados anteriores da **mesma rubrica** do processo atual. Essa restrição evita misturar rubricas e mantém a conciliação do demonstrativo simples.

**Condições para um crédito ser candidato:**

| Condição | Regra |
|----------|-------|
| Status do crédito | `RETIDO` |
| Processo de origem | `FINALIZADO` |
| Rubrica | mesma rubrica do processo atual |
| Período | anterior ao período do processo atual (`YYYY-MM`) |
| Liberação anterior | crédito ainda não efetivado como `LIBERADO` |
| Processo atual | processo em cálculo, ainda não finalizado |
| Processo concorrente | crédito não pode estar vinculado a outra liberação prevista em processo ativo |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Ao calcular um processo, o sistema deve buscar créditos `RETIDO` de processos `FINALIZADO` anteriores da mesma rubrica | Must Have |
| RF-02 | Créditos de processos cancelados, criados, calculados ou aprovados não devem ser candidatos | Must Have |
| RF-03 | Créditos já efetivamente liberados não devem ser candidatos novamente | Must Have |
| RF-04 | Crédito com liberação prevista em outro processo ativo não deve ser selecionado por concorrência | Must Have |
| RF-05 | A seleção deve usar período mensal `YYYY-MM` e considerar apenas períodos anteriores ao processo atual | Must Have |
| RF-06 | Se não houver candidatos, o cálculo deve seguir normalmente com totais de liberação zerados | Must Have |
| RF-07 | A busca deve ser paginável/streamável internamente para não carregar volume grande de retidos em memória | Should Have |

**Critérios de Aceitação — RF-01 + RF-05:**
- **Given** existe um processo finalizado `RADIO/2026-03` com crédito `RETIDO`
- **And** o Analista calcula um novo processo `RADIO/2026-04`
- **When** a seleção de candidatos executa
- **Then** o crédito retido de `RADIO/2026-03` é selecionado para reavaliação

**Critérios de Aceitação — RF-02:**
- **Given** existe um processo `RADIO/2026-03` cancelado com crédito `RETIDO`
- **When** o Analista calcula `RADIO/2026-04`
- **Then** o crédito do processo cancelado não é selecionado

**Critérios de Aceitação — RF-04:**
- **Given** um crédito retido está vinculado como liberação prevista em um processo `CALCULADO`
- **When** outro processo tenta selecionar candidatos
- **Then** esse crédito não é selecionado até o processo ativo ser finalizado ou cancelado

### 2. Reavaliação Cadastral

Cada candidato deve ser reavaliado contra o Cadastro. A regra de liberação não depende apenas do motivo original persistido pela F04; o sistema deve verificar todos os pré-requisitos atuais para evitar liberar um crédito que teve uma pendência resolvida, mas ainda possui outra pendência.

**Um crédito é elegível para liberação quando:**

| Pré-requisito | Regra |
|---------------|-------|
| Obra | status atual da obra é `LIBERADA`/`LIBERADO` |
| Titular autoral | titular ainda consta na titularidade autoral da obra e possui `associacaoSigla` preenchida |
| Titular conexo | titular ainda consta na participação conexa do fonograma original e possui `associacaoSigla` preenchida |
| Valor | valor original do crédito retido é maior que zero |
| Integridade | dados mínimos do Cadastro foram retornados no ownership snapshot |

**Resultados possíveis de reavaliação:**

| Resultado | Efeito |
|-----------|--------|
| `ELEGIVEL` | gera liberação prevista no processo atual |
| `OBRA_PENDENTE` | permanece retido |
| `OBRA_BLOQUEADA` | permanece retido |
| `TITULAR_SEM_ASSOCIACAO` | permanece retido |
| `OBRA_NAO_DISTRIBUIVEL` | permanece retido; sem liberação automática nesta PoC |
| `PARTICIPACAO_NAO_ENCONTRADA` | permanece retido; exige ajuste/manual em feature futura |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-08 | A reavaliação deve consultar o Cadastro em batch usando o ACL de ownership snapshot, sem chamada por crédito | Must Have |
| RF-09 | A reavaliação deve aceitar defensivamente `LIBERADA` e `LIBERADO` como status de obra distribuível | Must Have |
| RF-10 | Crédito retido por obra pendente/bloqueada só pode ser liberado se a obra estiver distribuível e o titular também estiver associado | Must Have |
| RF-11 | Crédito retido por titular sem associação só pode ser liberado se a obra estiver distribuível e o titular possuir associação no Cadastro | Must Have |
| RF-12 | Para crédito autoral, o titular deve aparecer na titularidade autoral atual da obra | Must Have |
| RF-13 | Para crédito conexo, o titular deve aparecer na participação conexa atual do fonograma original | Must Have |
| RF-14 | A F05 não recalcula percentual aplicado nem valor monetário; usa o valor original do crédito retido | Must Have |
| RF-15 | Obras `DEPURADA`, `DOMINIO_PUBLICO` ou não encontradas não geram liberação automática | Must Have |
| RF-16 | Se o contrato do Cadastro vier sem campos obrigatórios para reavaliação, o cálculo deve falhar com erro de integridade de contrato | Must Have |
| RF-17 | Créditos reavaliados mas ainda não elegíveis devem registrar data da última reavaliação e motivo atual de bloqueio | Should Have |

**Critérios de Aceitação — RF-10:**
- **Given** um crédito retido por `OBRA_PENDENTE`
- **And** o Cadastro agora retorna a obra como `LIBERADA`
- **And** o titular possui associação vinculada
- **When** o novo processo é calculado
- **Then** o crédito é marcado como liberação prevista no processo atual

**Critérios de Aceitação — RF-11:**
- **Given** um crédito retido por `TITULAR_SEM_ASSOCIACAO`
- **And** o Cadastro agora retorna o titular com `associacaoSigla=UBC`
- **And** a obra está `LIBERADA`
- **When** o novo processo é calculado
- **Then** o crédito é marcado como liberação prevista

**Critérios de Aceitação — RF-14:**
- **Given** o crédito retido original tem `valorCredito=400.00`
- **When** ele se torna elegível para liberação
- **Then** o valor previsto para liberação é `400.00`, sem recalcular split, peso ou percentual cadastral

**Critérios de Aceitação — RF-15:**
- **Given** um crédito retido ligado a uma obra que agora está `DEPURADA`
- **When** o novo processo reavalia candidatos
- **Then** o crédito permanece retido com resultado atual `OBRA_NAO_DISTRIBUIVEL`

### 3. Liberação Prevista e Efetivação na Finalização

A F05 precisa respeitar a máquina de estados do Processo de Distribuição. Calcular um processo cria liberações previstas; finalizar o processo efetiva as liberações. Cancelar o processo desfaz ou cancela as previsões.

**Estados da liberação:**

```
PREVISTA → EFETIVADA
    ↓
CANCELADA
```

| Estado | Quando ocorre | Efeito no crédito original |
|--------|---------------|----------------------------|
| `PREVISTA` | cálculo do processo atual encontrou crédito elegível | crédito original continua `RETIDO` |
| `EFETIVADA` | processo atual foi finalizado | crédito original passa para `LIBERADO` |
| `CANCELADA` | processo atual foi cancelado antes da finalização | crédito original permanece `RETIDO` |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-18 | Ao calcular o processo, criar uma liberação `PREVISTA` para cada crédito elegível | Must Have |
| RF-19 | Liberação `PREVISTA` deve estar vinculada ao processo atual e ao crédito retido original | Must Have |
| RF-20 | Crédito original deve permanecer `RETIDO` enquanto a liberação estiver apenas `PREVISTA` | Must Have |
| RF-21 | Ao finalizar o processo atual, todas as liberações `PREVISTA` devem transicionar para `EFETIVADA` | Must Have |
| RF-22 | Ao efetivar, o crédito original deve transicionar para `LIBERADO`, preenchendo `liberadoEm` e `processoLiberacaoId` | Must Have |
| RF-23 | Ao cancelar o processo atual, liberações `PREVISTA` devem virar `CANCELADA` ou ser descartadas, e o crédito original deve permanecer `RETIDO` | Must Have |
| RF-24 | Reprocessamento técnico da mesma transação não pode gerar liberação duplicada para o mesmo crédito retido | Must Have |
| RF-25 | Uma liberação efetivada não pode ser revertida por cancelamento posterior, pois processo finalizado é irreversível | Must Have |

**Critérios de Aceitação — RF-18 + RF-20:**
- **Given** um crédito retido está elegível
- **When** o Analista calcula o processo atual
- **Then** existe uma liberação `PREVISTA` vinculada ao crédito
- **And** o crédito original ainda possui status `RETIDO`

**Critérios de Aceitação — RF-21 + RF-22:**
- **Given** um processo possui 2 liberações `PREVISTA`
- **When** o Analista finaliza o processo
- **Then** as 2 liberações ficam `EFETIVADA`
- **And** os 2 créditos originais passam para status `LIBERADO`
- **And** cada crédito recebe `processoLiberacaoId` do processo finalizado e `liberadoEm` preenchido

**Critérios de Aceitação — RF-23:**
- **Given** um processo possui liberações `PREVISTA`
- **When** o Analista cancela o processo antes da finalização
- **Then** as liberações são canceladas/descartadas
- **And** os créditos originais continuam `RETIDO`

### 4. Persistência, Consulta e Resumo do Processo

A implementação deve tornar créditos liberados auditáveis sem misturar o valor liberado com a verba líquida do processo atual. O processo atual deve exibir os retidos liberados como uma seção própria do cálculo.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-26 | Expandir `StatusCredito` para incluir `LIBERADO` | Must Have |
| RF-27 | Persistir `liberado_em` e `processo_liberacao_id` no crédito original efetivamente liberado | Must Have |
| RF-28 | Persistir uma entidade/registro de liberação com `creditoRetidoId`, `processoOrigemId`, `processoLiberacaoId`, `status`, `valorLiberado`, `avaliadoEm` e `efetivadoEm` | Must Have |
| RF-29 | Processo atual deve armazenar `total_creditos_retidos_liberados` e `valor_total_retidos_liberados` no resumo | Must Have |
| RF-30 | `valor_total_retidos_liberados` não deve ser somado à verba líquida nem alterar o rateio dos créditos do processo atual | Must Have |
| RF-31 | `GET /api/v1/processos/{id}/calculo` deve retornar totais de retidos a liberar/liberados no resumo | Must Have |
| RF-32 | A consulta de cálculo deve retornar seção/lista de retidos a liberar com processo de origem, período de origem, titular, obra/fonograma, motivo original, retidoEm e valor | Must Have |
| RF-33 | A consulta de créditos deve permitir filtrar por `status=LIBERADO` para visualizar créditos históricos já liberados | Should Have |
| RF-34 | A tela de cálculo deve exibir os retidos a liberar em seção separada dos créditos calculados do período atual | Must Have |
| RF-35 | Após finalização, a tela deve exibir os retidos como liberados, não apenas previstos | Must Have |

**Critérios de Aceitação — RF-29 + RF-30:**
- **Given** o processo atual tem verba líquida de R$ 85.000,00
- **And** há R$ 1.250,00 de créditos retidos previstos para liberação
- **When** o cálculo é consultado
- **Then** o resumo mostra `valorTotalRetidosLiberados=1250.00`
- **And** o rateio dos créditos atuais continua baseado somente na verba líquida de R$ 85.000,00

**Critérios de Aceitação — RF-32:**
- **Given** um crédito retido de `RADIO/2026-03` será liberado em `RADIO/2026-04`
- **When** o Analista abre o cálculo de `RADIO/2026-04`
- **Then** a seção de retidos mostra período origem `2026-03`, motivo original, titular, obra e valor liberado

### 5. Eventos de Liberação

Cada crédito efetivamente liberado deve publicar um evento `distribuicao.credito.liberado`. O evento deve ser gerado apenas na finalização do processo, quando a liberação se torna definitiva.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-36 | Ao finalizar processo com liberações previstas, salvar um evento `distribuicao.credito.liberado` na outbox para cada crédito efetivado | Must Have |
| RF-37 | O evento deve ser salvo na mesma transação que efetiva a liberação e atualiza o crédito original para `LIBERADO` | Must Have |
| RF-38 | O payload deve conter `creditoId`, `processoOrigemId`, `processoLiberacaoId`, `rubricaSigla`, `periodoOrigem`, `periodoLiberacao`, `titularId`, `titularNome`, `obraId`, `obraTitulo`, `fonogramaId`, `categoria`, `subcategoriaConexa`, `valorLiberado`, `motivoRetencaoOriginal`, `retidoEm`, `liberadoEm` | Must Have |
| RF-39 | O evento deve seguir o formato CloudEvents usado pelo domínio Distribuição | Must Have |
| RF-40 | O evento `distribuicao.processo.finalizado` deve incluir totais de retidos liberados no payload | Should Have |
| RF-41 | Redelivery da outbox pode publicar o evento mais de uma vez; consumers devem tratar `id` do evento como idempotência | Must Have |

**Exemplo de payload de `data`:**

```json
{
  "creditoId": "1b2f7f61-b2ac-4c69-81b5-85f6e8c1b553",
  "processoOrigemId": "4e5af094-81b8-404e-8324-82b795395d2c",
  "processoLiberacaoId": "604fe815-52c8-4ad6-a6f3-3f02ec55f922",
  "rubricaSigla": "RADIO",
  "periodoOrigem": "2026-03",
  "periodoLiberacao": "2026-04",
  "titularId": "9f0fdd3f-b4b1-4f51-bac1-62379d230e9a",
  "titularNome": "Maria Compositora",
  "obraId": "2f897625-0a2f-4f9c-9e7c-c21b9e4b34a5",
  "obraTitulo": "Meu Bem Querer",
  "fonogramaId": null,
  "categoria": "AUTORAL",
  "subcategoriaConexa": null,
  "valorLiberado": 400.00,
  "motivoRetencaoOriginal": "TITULAR_SEM_ASSOCIACAO",
  "retidoEm": "2026-05-17T14:30:00Z",
  "liberadoEm": "2026-06-10T18:45:00Z"
}
```

**Critérios de Aceitação — RF-36 + RF-37:**
- **Given** o processo possui 3 liberações `PREVISTA`
- **When** o Analista finaliza o processo
- **Then** existem 3 eventos `distribuicao.credito.liberado` na outbox
- **And** os créditos originais estão com status `LIBERADO` na mesma transação

### 6. Permissionamento e Auditoria

F05 não introduz ações manuais novas. O Analista continua usando o fluxo de cálculo, aprovação, finalização e cancelamento de processos.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-42 | Identificar liberações previstas usa a permissão existente `distribuicao:default:processo:calcular` | Must Have |
| RF-43 | Efetivar liberações usa a permissão existente `distribuicao:default:processo:finalizar` | Must Have |
| RF-44 | Consultar liberações previstas/efetivadas usa a permissão existente `distribuicao:default:processo:visualizar` | Must Have |
| RF-45 | Nenhum endpoint de liberação manual deve ser criado nesta feature | Must Have |
| RF-46 | O evento de auditoria do cálculo deve incluir `totalRetidosALiberar` e `valorTotalRetidosALiberar` no `dataChange.after` do processo | Must Have |
| RF-47 | O evento de auditoria da finalização deve incluir `totalRetidosLiberados` e `valorTotalRetidosLiberados` no `dataChange.after` | Must Have |
| RF-48 | Não gerar `userAction` separado por crédito liberado; a ação auditável é a finalização do processo pelo Analista | Must Have |

---

## Experiência do Usuário

### Fluxo Principal — Calcular com Liberações Previstas
1. Analista abre um processo no estado `CRIADO`
2. Clica em "Calcular"
3. Sistema calcula os créditos do período atual
4. Sistema busca créditos retidos candidatos da mesma rubrica em períodos anteriores
5. Sistema consulta o Cadastro e identifica créditos elegíveis para liberação
6. Tela de cálculo exibe resumo de créditos atuais, retidos atuais e retidos a liberar
7. Analista revisa a lista de retidos a liberar antes de aprovar

### Fluxo Principal — Finalizar com Liberação
1. Processo calculado é aprovado pelo Analista
2. Analista finaliza o processo
3. Sistema efetiva liberações previstas
4. Créditos históricos passam de `RETIDO` para `LIBERADO`
5. Eventos `distribuicao.credito.liberado` são gravados na outbox
6. Tela passa a mostrar os itens como retidos liberados pelo processo finalizado

### Fluxo Alternativo — Cancelar com Liberações Previstas
1. Processo possui liberações `PREVISTA`
2. Analista cancela o processo antes da finalização
3. Sistema cancela/descarta as liberações previstas
4. Créditos históricos permanecem `RETIDO`

### Considerações de UI
- Exibir retidos a liberar em seção separada dos créditos calculados do período atual
- Mostrar cards/resumo para: `Créditos a liberar`, `Valor a liberar`, `Créditos liberados` e `Valor liberado`, conforme estado do processo
- Usar badge `Previsto` antes da finalização e `Liberado` após a finalização
- Mostrar motivo original da retenção e, quando disponível, data da última reavaliação
- Não criar botão "Liberar"; a ação continua sendo finalizar processo
- Deixar claro visualmente que o valor liberado não compõe a verba líquida do período atual

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot no serviço `distribuicao-api`
- Dados no schema `distribuicao` do PostgreSQL
- Sem joins cross-schema; dados cadastrais vêm somente pelo ACL HTTP do Cadastro
- Consulta ao Cadastro deve ser batch, reaproveitando o endpoint de ownership snapshot usado pelo cálculo
- Valores monetários e percentuais sempre com `BigDecimal`; nunca `float`/`double`
- Liberações previstas e efetivações devem respeitar a transação dos comandos de cálculo/finalização
- Publicação via Outbox Pattern já existente no domínio Distribuição
- Formato CloudEvents nos eventos publicados
- Authz pelo `authz-spring-boot-starter` com `@RequiresPermission`; não usar checagem local de roles
- Auditoria pelo `audit-sdk` já integrado no serviço
- Frontend React + Vite, reaproveitando a tela de cálculo do módulo Distribuição

---

## Não-Objetivos (Fora de Escopo)

- Liberação manual de créditos retidos fora do fluxo de processo
- Liberação cross-rubrica; o MVP libera apenas retidos da mesma rubrica do processo atual
- Recalcular valor, percentual, peso ou split do crédito retido
- Alterar processo de origem ou refazer distribuição de período anterior
- Liberar créditos de obras `DEPURADA`, `DOMINIO_PUBLICO` ou com participação não encontrada
- Prescrição de créditos retidos após 5 anos
- Pagamento efetivo ao titular
- Demonstrativo completo de créditos — F07
- Ajustes por estorno — F06
- Corrigir contratos de período (`YYYY-MM-DD` vs `YYYY-MM`) entre Identificação, Arrecadação e Distribuição
- Alterar regras ou telas do Cadastro para regularização cadastral
- Criar DLQ/retry especializado para eventos de liberação

---

## Rastreabilidade

### Vision Doc
- **Fase:** Fase 3 — Distribuição
- **Objetivo atendido:** Completar o ciclo de créditos retidos dentro do processo de distribuição
- **Glossário:** Crédito Retido — crédito bloqueado por pendência cadastral
- **Restrição global:** Schema-per-Service, RabbitMQ, Event-Driven, PoC auto-contida
- **Simplificação:** Prescrição de créditos retidos fora do escopo

### Domain Doc (Distribuição — D04)
- **Feature:** F05 — Liberação de Créditos Retidos
- **Entidades:** Crédito, Crédito Retido, Processo de Distribuição, Demonstrativo futuro
- **Regra referenciada:** RN-06 — Créditos retidos são liberados na próxima execução do processo de distribuição, quando a pendência cadastral tiver sido resolvida
- **Regra relacionada:** RN-05 — Motivos de retenção definidos pela F04
- **Dependência upstream:** Cadastro — status de obras e vínculo titular-associação via ownership snapshot
- **Dependência interna:** F04 — Retenção de Créditos
- **Evento produzido:** `distribuicao.credito.liberado`
- **Ordem de implementação:** Quinta feature do domínio, após retenção de créditos

### PRD F04 — Retenção de Créditos
- **Dados consumidos:** créditos `RETIDO`, `motivoRetencao`, `retidoEm`, processo de origem, valor original
- **Decisão herdada:** um único motivo principal é persistido na retenção, mas F05 reavalia todos os pré-requisitos antes de liberar
- **Continuidade:** F04 gera `distribuicao.credito.retido`; F05 gera `distribuicao.credito.liberado`

---

## Questões em Aberto

Todas as questões funcionais deste PRD foram resolvidas:

| Questão | Decisão |
|---------|---------|
| Liberação é manual ou automática? | Automática durante o processo de distribuição |
| Quando a liberação se torna definitiva? | Na finalização do processo, não no cálculo |
| Cancelar processo com liberação prevista libera crédito? | Não; crédito permanece `RETIDO` |
| Liberação recalcula valor? | Não; usa o valor original retido |
| Liberação pode cruzar rubricas? | Não no MVP; mesma rubrica do processo atual |
| Crédito de obra depurada/domínio público libera automaticamente? | Não; permanece retido para ajuste/manual futuro |
| A F05 gera demonstrativo completo? | Não; apenas prepara dados para F07 |

PRD pronto para Tech Spec.

---

*Para gerar a Especificação Técnica, use este PRD junto com `vision.md`, `domains/distribuicao/domain.md` e `tasks/distribuicao/prd-retencao-creditos/prd.md` como contexto.*
