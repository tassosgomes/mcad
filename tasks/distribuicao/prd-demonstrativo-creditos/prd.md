# PRD — F07: Demonstrativo de Créditos

> **Domínio:** Distribuição (D04)
> **Feature ID:** F07
> **Prioridade:** Must Have
> **Status:** `prd-ready`
> **Data:** 2026-06-07
> **Contexto:** criado a partir de `vision.md`, `domains/distribuicao/domain.md`, e dos PRDs de F02 (gestão de processos), F03 (cálculo de créditos), F04 (retenção) e F05 (liberação de retidos).

---

## Visão Geral

O Demonstrativo de Créditos é o "holerite" de direitos autorais do titular: um relatório somente leitura, por processo finalizado, que consolida todos os créditos calculados, créditos retidos por pendência cadastral e créditos de processos anteriores que foram liberados neste processo. É a última peça do ciclo de distribuição — sem ela, o resultado do cálculo existe no banco de dados mas não é consultável de forma útil pelos analistas e consultores.

**Problema:** após a finalização de um processo de distribuição, os créditos estão persistidos na tabela `creditos` do schema `distribuicao`, mas não há endpoint dedicado nem tela que apresente esses créditos organizados por titular em formato de demonstrativo. Analistas e consultores precisam conseguir consultar o que cada titular irá receber (ou o que ficou retido) em um determinado processo.

**Solução:** criar uma API de consulta de demonstrativo que agrega créditos por titular para um processo específico, e uma tela React que permite ao Analista ou Consultor selecionar um titular e visualizar o demonstrativo detalhado daquele processo — com créditos calculados, créditos retidos e créditos liberados de retenções anteriores, cada grupo em seção própria.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Tornar o resultado da distribuição consultável por titular | Dado um processo finalizado, qualquer titular com créditos pode ter seu demonstrativo carregado em menos de 2 segundos |
| Oferecer visão consolidada do que o titular recebe no processo | A tela exibe total a receber, total retido e total liberado de retenções anteriores em cards de resumo |
| Distinguir claramente os três grupos de créditos | Créditos calculados (CALCULADO), créditos retidos do período atual (RETIDO) e créditos liberados de processos anteriores (LIBERADO) aparecem em seções separadas e identificadas |
| Preparar contrato de API para integração futura com F06 (Ajustes por Estorno) | Resposta da API inclui seção `ajustesEstorno` vazia agora; F06 a preencherá quando implementado |

---

## Histórias de Usuário

### HU-01 — Listar titulares com créditos em um processo
**Como** Analista de Distribuição,
**eu quero** ver a lista de titulares que possuem créditos em um processo finalizado,
**para que** eu possa selecionar o titular cujo demonstrativo desejo consultar.

### HU-02 — Consultar demonstrativo de um titular em um processo
**Como** Analista de Distribuição,
**eu quero** abrir o demonstrativo de um titular específico em um processo,
**para que** eu veja o detalhamento de cada crédito por obra, categoria, percentual e valor, além do resumo financeiro.

### HU-03 — Identificar créditos retidos no processo atual
**Como** Consultor de Distribuição,
**eu quero** visualizar quais créditos foram retidos por pendência cadastral neste processo e qual é o motivo de cada retenção,
**para que** eu possa informar o titular da razão pela qual parte dos valores não será recebida agora.

### HU-04 — Verificar créditos liberados de processos anteriores
**Como** Analista de Distribuição,
**eu quero** ver quais créditos retidos em processos anteriores foram liberados e efetivados neste processo,
**para que** eu entenda por que o total a receber do titular inclui valores além do período corrente.

### HU-05 — Filtrar demonstrativos por titular dentro de um processo
**Como** Consultor de Distribuição,
**eu quero** pesquisar por nome ou identificador do titular na lista de um processo,
**para que** eu localize rapidamente um titular em processos com muitos credenciados.

---

## Funcionalidades Principais

### 1. Listagem de Titulares do Processo

O demonstrativo começa com uma lista resumida: quais titulares possuem créditos (de qualquer status) no processo consultado. Essa lista serve de índice para navegar aos demonstrativos individuais.

**Campos por titular na listagem:**

| Campo | Descrição |
|-------|-----------|
| `titularId` | Identificador do titular |
| `titularNome` | Nome do titular (desnormalizado nos créditos) |
| `totalCalculado` | Soma dos valores CALCULADO do titular neste processo |
| `totalRetido` | Soma dos valores RETIDO do titular neste processo |
| `totalLiberado` | Soma dos valores LIBERADO (processoLiberacaoId = processoId) do titular |
| `totalAReceber` | `totalCalculado + totalLiberado` |
| `quantidadeObras` | Contagem de obras distintas com crédito CALCULADO ou LIBERADO |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Criar endpoint `GET /api/v1/processos/{id}/demonstrativos` que retorna lista paginada de titulares com créditos no processo | Must Have |
| RF-02 | A listagem deve suportar filtro por `titularNome` (busca parcial, case-insensitive) | Must Have |
| RF-03 | A listagem deve funcionar para processos em qualquer status, mas exibe aviso visual quando o processo não está `FINALIZADO` | Should Have |
| RF-04 | A listagem deve ser ordenada por `titularNome` ascendente por padrão, com opção de ordenar por `totalAReceber` descrescente | Should Have |

**Critérios de Aceitação — RF-01:**
- **Given** processo `P1` com créditos para 3 titulares distintos
- **When** analista acessa `GET /processos/P1/demonstrativos`
- **Then** resposta contém 3 entradas com resumo financeiro por titular

**Critérios de Aceitação — RF-02:**
- **Given** listagem com titular "João Silva" e "Ana Silva"
- **When** filtro `titularNome=silva` é aplicado
- **Then** ambos aparecem no resultado

### 2. Demonstrativo Individual por Titular

O demonstrativo detalha os créditos de um titular específico em um processo, dividido em três seções: créditos calculados no período, créditos retidos no período e créditos liberados de processos anteriores.

**Estrutura do demonstrativo:**

```
Demonstrativo
├── Cabeçalho: titular, processo, rubrica, período, status do processo, datas
├── Resumo financeiro: totalAReceber, totalRetido, totalLiberado, totalAjustesEstorno (vazio)
├── Seção 1 — Créditos do Período (CALCULADO)
│   └── Linha por crédito: obra, fonograma, categoria, subcategoria, percentual, valorObra, valorCredito
├── Seção 2 — Créditos Retidos (RETIDO neste processo)
│   └── Linha por crédito: obra, fonograma, categoria, motivoRetencao, valorCredito, retidoEm
├── Seção 3 — Créditos Liberados de Retenções Anteriores (LIBERADO neste processo)
│   └── Linha por crédito: obra, fonograma, categoria, processoOrigem, motivoOriginal, valorCredito, liberadoEm
└── Seção 4 — Ajustes por Estorno (vazia; preenchida pelo F06 quando implementado)
```

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-05 | Criar endpoint `GET /api/v1/processos/{id}/demonstrativos/{titularId}` que retorna o demonstrativo completo | Must Have |
| RF-06 | O demonstrativo deve retornar 404 quando não houver créditos do titular no processo | Must Have |
| RF-07 | A Seção 1 (CALCULADO) deve listar todos os créditos do titular com `processoId = id` e `status = CALCULADO` | Must Have |
| RF-08 | A Seção 2 (RETIDO) deve listar todos os créditos do titular com `processoId = id` e `status = RETIDO`, incluindo `motivoRetencao` legível | Must Have |
| RF-09 | A Seção 3 (LIBERADO) deve listar créditos do titular com `processoLiberacaoId = id` e `status = LIBERADO`, incluindo referência ao processo de origem | Must Have |
| RF-10 | A Seção 4 (ajustes) deve estar presente na resposta como lista vazia, com campo `totalAjustesEstorno = 0.00`, para compatibilidade futura com F06 | Must Have |
| RF-11 | O campo `totalAReceber` do resumo deve ser exatamente `sum(CALCULADO.valorCredito) + sum(LIBERADO.valorCredito)` | Must Have |
| RF-12 | O campo `totalRetido` do resumo deve ser exatamente `sum(RETIDO.valorCredito)` do período atual (processoId = id) | Must Have |
| RF-13 | Valores monetários devem ser retornados como `string` decimal com 2 casas (`"1234.56"`) para evitar imprecisão de ponto flutuante em JSON | Must Have |
| RF-14 | Percentuais devem ser retornados com 6 casas decimais (`"66.670000"`) para fidelidade ao modelo | Should Have |

**Critérios de Aceitação — RF-07 + RF-08 + RF-09:**
- **Given** titular T1 tem 2 créditos CALCULADO, 1 RETIDO e 1 LIBERADO (de processo anterior) no processo P1
- **When** analista acessa `GET /processos/P1/demonstrativos/T1`
- **Then** Seção 1 tem 2 linhas, Seção 2 tem 1 linha, Seção 3 tem 1 linha

**Critérios de Aceitação — RF-11:**
- **Given** CALCULADO soma R$ 600,00 e LIBERADO soma R$ 200,00
- **When** demonstrativo é consultado
- **Then** `totalAReceber = "800.00"`

**Critérios de Aceitação — RF-06:**
- **Given** titular T99 sem nenhum crédito no processo P1
- **When** analista acessa `GET /processos/P1/demonstrativos/T99`
- **Then** resposta é 404 com mensagem indicando ausência de créditos

### 3. Tela de Demonstrativos no Frontend

A feature é acessada a partir da tela de detalhe do processo. Uma aba ou seção "Demonstrativos" lista os titulares e permite abrir o demonstrativo individual.

**Fluxo de navegação:**
1. Analista abre processo finalizado → aba "Demonstrativos"
2. Tela exibe tabela de titulares com totais resumidos + campo de busca por nome
3. Analista clica em titular → expande drawer lateral ou navega para página de detalhe
4. Tela exibe cabeçalho do processo, resumo financeiro e as quatro seções de crédito

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-15 | Criar aba/seção "Demonstrativos" na tela de detalhe do processo | Must Have |
| RF-16 | Exibir tabela de titulares com colunas: nome, total a receber, total retido, total liberado, quantidade de obras | Must Have |
| RF-17 | Incluir campo de busca por nome do titular (filtro client-side ou query param) | Must Have |
| RF-18 | Ao selecionar titular, exibir demonstrativo detalhado com as quatro seções identificadas | Must Have |
| RF-19 | Cards de resumo financeiro devem destacar visualmente `totalAReceber` (valor positivo em destaque), `totalRetido` (alerta) e `totalLiberado` (destaque secundário) | Should Have |
| RF-20 | Se o processo não estiver `FINALIZADO`, exibir aviso: "Demonstrativo disponível após finalização do processo" e desabilitar a funcionalidade | Must Have |
| RF-21 | A Seção 2 (retidos) deve exibir o motivo de retenção com badge legível: `OBRA_PENDENTE`, `OBRA_BLOQUEADA`, `TITULAR_SEM_ASSOCIACAO` | Must Have |
| RF-22 | A Seção 3 (liberados) deve exibir a referência ao processo de origem como link para o detalhe daquele processo | Should Have |
| RF-23 | A Seção 4 (ajustes) deve aparecer com estado vazio informando "Nenhum ajuste por estorno neste processo" enquanto F06 não for implementado | Must Have |

---

## Experiência do Usuário

### Fluxo Principal — Consulta de Demonstrativo

1. Analista acessa "Distribuição" → "Processos" → seleciona processo `FINALIZADO`
2. Na tela de detalhe, clica na aba "Demonstrativos"
3. Sistema exibe tabela com todos os titulares que possuem créditos no processo
4. Analista busca titular pelo nome ou navega pela lista
5. Analista clica no titular desejado
6. Sistema exibe demonstrativo detalhado:
   - Cabeçalho: nome do titular, processo, rubrica, período
   - Cards de resumo: total a receber (CALCULADO + LIBERADO), total retido, total liberado de retenções
   - Tabela de créditos do período (CALCULADO): obra, categoria, percentual, valor
   - Tabela de créditos retidos (RETIDO): obra, categoria, motivo, valor
   - Tabela de liberados de processos anteriores (LIBERADO): obra, processo de origem, valor
   - Seção de ajustes por estorno: vazia com mensagem informativa

### Fluxo Alternativo — Processo Não Finalizado

1. Analista acessa processo em status `CALCULADO` ou `APROVADO`
2. Aba "Demonstrativos" está visível mas com conteúdo desabilitado
3. Sistema exibe mensagem: "O demonstrativo estará disponível após a finalização do processo"
4. Analista retorna ao fluxo de finalização

### Considerações de UI

- A tela reutiliza o padrão de tabela e paginação já existente em `features/distribuicao/processos`
- Badges de status de crédito: `CALCULADO` (neutro), `RETIDO` (amarelo/alerta), `LIBERADO` (verde)
- Valores monetários no frontend formatados como `R$ 1.234,56` (localização pt-BR)
- Percentuais exibidos com 4 casas decimais: `66,6700%`
- O campo de busca de titular deve ser exibido apenas quando houver 5 ou mais titulares na lista
- Seções com zero linhas são exibidas com estado vazio descritivo (não ocultas), para que o analista saiba que a categoria existe mas não tem registros

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot no serviço `distribuicao-api`; dados no schema `distribuicao` do PostgreSQL
- Consultas à tabela `creditos` por `processoId + titularId` (Seção 1 e 2) e por `processoLiberacaoId + titularId` (Seção 3); ambas precisam de índice adequado (verificar migração existente)
- A listagem de titulares deve ser computada por query agregada (GROUP BY) — não por coleção em memória
- Sem join cross-schema — todos os dados do demonstrativo estão na tabela `creditos` do schema `distribuicao`; o nome da obra e do titular já estão desnormalizados nos créditos
- Frontend React + Vite, reutilizando padrões de `features/distribuicao/processos`
- Authz pelo `authz-spring-boot-starter` com `@RequiresPermission`; não usar checagem local de roles
- Valores monetários sempre com `BigDecimal` no backend; `string` decimal no JSON

---

## Permissionamento (ecad-authz)

F07 é somente leitura; não há escrita acionada por usuário.

| key | name | Endpoint(s) | Perfil-base sugerido |
|---|---|---|---|
| `distribuicao:default:demonstrativo:listar` | Listar titulares do demonstrativo | `GET /processos/{id}/demonstrativos` | consultor, analista |
| `distribuicao:default:demonstrativo:visualizar` | Visualizar demonstrativo por titular | `GET /processos/{id}/demonstrativos/{titularId}` | consultor, analista |

A proteção é no backend. O frontend deve esconder a aba "Demonstrativos" quando o usuário não possuir nenhuma das duas permissões acima, seguindo ADR 0004.

---

## Não-Objetivos (Fora de Escopo)

- **Exportação para PDF** — visualização web é suficiente para a PoC; usuário pode usar "imprimir" do browser
- **Acesso direto pelo titular** — não há login de titular nesta PoC; consulta é feita por analistas/consultores
- **Visão histórica consolidada por titular** — o demonstrativo é por processo; navegação entre processos é feita manualmente
- **Ajustes por estorno** — F07 reserva a seção mas não a implementa; F06 preencherá quando for entregue
- **Geração da tabela de demonstrativo como entidade persistida** — F07 é uma consulta (view/query) sobre a tabela `creditos` existente, não uma nova entidade materializada
- **Prescrição de créditos retidos** — regra de 5 anos está fora da PoC (RN-11 do Domain Doc)
- **Demonstrativo de processos cancelados** — processo cancelado não tem créditos definitivos; RF-20 cobre apenas o aviso para processos não finalizados

---

## Rastreabilidade

### Vision Doc
- **Fase:** Fase 3 — Distribuição
- **Objetivo atendido:** conclusão do ciclo de distribuição — créditos calculados ficam acessíveis via demonstrativo
- **Glossário:** Demonstrativo, Crédito, Crédito Retido, Crédito Liberado, Processo de Distribuição

### Domain Doc (Distribuição — D04)
- **Feature:** F07 — Demonstrativo de Créditos
- **Entidade:** Demonstrativo (view/query — não persistida)
- **Dependências internas:**
  - F02 — Gestão de Processos (status do processo; acesso via detalhe do processo)
  - F03 — Cálculo de Créditos (créditos CALCULADO)
  - F04 — Retenção de Créditos (créditos RETIDO com motivoRetencao)
  - F05 — Liberação de Créditos Retidos (créditos LIBERADO com processoLiberacaoId)
- **Dependência downstream:** F06 — Ajustes por Estorno (seção reservada, não implementada aqui)
- **Fonte de dados:** tabela `creditos` (schema `distribuicao`)
- **Eventos consumidos:** nenhum (somente leitura de dados já persistidos por F03/F04/F05)
- **Eventos produzidos:** nenhum (feature de consulta)
- **Ordem de implementação:** sétima e última feature do domínio

---

## Questões Resolvidas

| Questão | Decisão |
|---------|---------|
| Titular acessa o próprio demonstrativo? | Não. Apenas analistas e consultores. Login de titular não está na PoC. |
| Exportação PDF? | Fora do escopo. Visualização web suficiente. |
| Visão histórica multi-processo? | Não. Por processo apenas — alinhado ao domain.md. |
| F07 espera F06? | Não. Implementado sem a seção de ajustes. F06 a preenche quando entregue; contrato já reservado na resposta da API. |
| O demonstrativo é uma nova entidade persistida? | Não. É uma query/view sobre a tabela `creditos` existente. |
| Créditos de processo cancelado aparecem? | Não. Processo cancelado descarta créditos. F07 mostra aviso para processos não finalizados. |

PRD pronto para Tech Spec.

---

*PRD gerado seguindo o padrão de `ai-prd-creator`. Para gerar a Especificação Técnica, use este PRD junto com `vision.md` e `domains/distribuicao/domain.md` como contexto.*
