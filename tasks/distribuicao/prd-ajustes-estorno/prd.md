# PRD — F06: Ajustes por Estorno

> **Domínio:** Distribuição (D04)
> **Feature ID:** F06
> **Prioridade:** Must Have
> **Status:** `prd-ready`
> **Data:** 2026-05-20
> **Contexto:** criado a partir de `vision.md`, `domains/distribuicao/domain.md`, `tasks/distribuicao/prd-gestao-processos/prd.md`, `tasks/distribuicao/prd-retencao-creditos/prd.md`, `tasks/distribuicao/prd-liberacao-creditos-retidos/prd.md` e do contrato real `infra/schemas/v1/ArrecadacaoPagamentoEstornado.json`.

---

## Visão Geral

Ajustes por Estorno fecha a lacuna entre Arrecadação e Distribuição quando um pagamento confirmado é estornado depois que a Distribuição já calculou créditos usando a verba anterior. A Arrecadação publica `arrecadacao.pagamento.estornado` e recalcula a verba líquida, mas esse recálculo não altera retroativamente créditos já calculados, aprovados ou finalizados na Distribuição.

Esta feature cria uma compensação controlada: a Distribuição consome o evento de estorno, registra um `Ajuste de Estorno` idempotente, calcula o valor líquido a compensar e aplica o ajuste no próximo processo elegível da mesma rubrica. A aplicação gera linhas negativas proporcionais aos créditos do processo de origem, preservando rastreabilidade por titular, obra, fonograma, categoria e pagamento estornado.

**Problema:** sem ajuste, um estorno publicado depois do cálculo deixa a Distribuição com créditos calculados sobre uma verba maior que a verba líquida real do período.

**Solução:** registrar o estorno como ajuste financeiro e aplicar uma compensação negativa em processo futuro, sem reabrir processo finalizado nem violar o isolamento entre domínios.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Consumir estornos da Arrecadação com segurança | 100% dos eventos válidos `arrecadacao.pagamento.estornado` são registrados ou classificados como ignorados sem travar o consumidor |
| Evitar dupla compensação | Redelivery do mesmo evento não cria ajustes duplicados, usando `pagamentoId` e `id` do CloudEvent como idempotência |
| Compensar créditos calculados sobre verba estornada | Ajustes pendentes são vinculados ao próximo processo elegível da mesma rubrica |
| Preservar rastreabilidade financeira | Cada ajuste mantém pagamento, licença, rubrica, período de origem, processo de origem, processo de aplicação, autor do estorno e justificativa |
| Manter cálculo monetário consistente | Soma das linhas negativas aplicadas é exatamente igual ao valor líquido do ajuste, com alocação de resíduo controlada |
| Preparar demonstrativos | F07 consegue exibir débitos por estorno ao lado de créditos calculados, retidos e liberados |

---

## Histórias de Usuário

### HU-01 — Registrar estorno publicado pela Arrecadação
**Como** sistema de Distribuição,
**eu preciso** consumir `arrecadacao.pagamento.estornado`,
**para que** pagamentos cancelados pela Arrecadação sejam considerados no ciclo de distribuição.

### HU-02 — Classificar se o estorno exige ajuste
**Como** sistema de Distribuição,
**eu preciso** identificar se já existe processo calculado, aprovado ou finalizado para a rubrica e período do estorno,
**para que** eu crie ajuste apenas quando a verba estornada já tiver sido usada em créditos.

### HU-03 — Visualizar ajustes pendentes
**Como** Analista de Distribuição,
**eu quero** visualizar ajustes de estorno pendentes por rubrica e período de origem,
**para que** eu saiba que o próximo cálculo terá compensações financeiras.

### HU-04 — Aplicar ajuste no cálculo
**Como** Analista de Distribuição,
**eu preciso** que o cálculo do processo inclua ajustes pendentes elegíveis,
**para que** os créditos futuros compensem pagamentos estornados sem alterar processos históricos.

### HU-05 — Cancelar aplicação prevista quando o processo é cancelado
**Como** Analista de Distribuição,
**eu preciso** que ajustes previstos voltem a ficar pendentes se o processo de aplicação for cancelado,
**para que** nenhuma compensação seja efetivada por um processo inválido.

### HU-06 — Consultar ajustes aplicados no processo
**Como** Consultor de Distribuição,
**eu quero** consultar os ajustes aplicados em um processo,
**para que** eu possa auditar por que o valor líquido demonstrado ao titular possui débitos.

### HU-07 — Demonstrativo exibe débitos por estorno
**Como** titular,
**eu preciso** que meu demonstrativo futuro mostre ajustes de estorno com origem e justificativa,
**para que** eu entenda reduções de crédito decorrentes de pagamentos cancelados.

---

## Funcionalidades Principais

### 1. Consumo do Evento `arrecadacao.pagamento.estornado`

A Distribuição deve consumir o evento publicado pela Arrecadação no formato CloudEvents 1.0 e persistir o payload relevante no schema `distribuicao`.

**Contrato consumido:**

| Campo | Obrigatório | Uso na Distribuição |
|-------|-------------|---------------------|
| `id` | sim | Idempotência do evento CloudEvents |
| `data.pagamentoId` | sim | Chave de negócio do ajuste; pagamento só pode ser estornado uma vez |
| `data.licencaId` | sim | Rastreabilidade do pagamento estornado |
| `data.rubricaSigla` | sim | Rubrica afetada e critério de elegibilidade |
| `data.periodo` | sim | Período de origem do estorno (`YYYY-MM`) |
| `data.quantidadeUdas` | sim | Rastreabilidade financeira |
| `data.valorEstornado` | sim | Valor bruto estornado; base para cálculo do valor líquido |
| `data.justificativa` | sim | Rastreabilidade e exibição |
| `data.estornadoPor` | sim | Autor do estorno no domínio Arrecadação |
| `data.estornadoEm` | sim | Ordem temporal e auditoria |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | O sistema deve consumir eventos `arrecadacao.pagamento.estornado` do RabbitMQ | Must Have |
| RF-02 | O consumidor deve validar campos obrigatórios conforme `ArrecadacaoPagamentoEstornado.json` | Must Have |
| RF-03 | Evento inválido deve ser descartado com log de erro, sem bloquear eventos subsequentes | Must Have |
| RF-04 | O consumo deve ser idempotente por `pagamentoId` e `id` do CloudEvent | Must Have |
| RF-05 | Se o mesmo `pagamentoId` chegar novamente com payload divergente, manter o primeiro registro e registrar conflito operacional em log | Must Have |
| RF-06 | O payload original deve ser armazenado para auditoria técnica e reprocessamento assistido | Should Have |

**Critérios de Aceitação — RF-01 + RF-04:**
- **Given** a Arrecadação publica `arrecadacao.pagamento.estornado` para o pagamento `PAG-1`
- **When** a Distribuição processa o evento
- **Then** existe um ajuste local relacionado a `PAG-1`
- **And** reprocessar o mesmo evento não cria outro ajuste

**Critérios de Aceitação — RF-03:**
- **Given** o evento chega sem `rubricaSigla`
- **When** o consumidor tenta processá-lo
- **Then** o evento é descartado com log de erro
- **And** o consumidor continua processando eventos seguintes

### 2. Registro e Ciclo de Vida do Ajuste

O ajuste é uma entidade própria, separada de `Credito`, porque nasce de um evento externo e só vira linha financeira quando aplicado em um processo.

**Campos principais do Ajuste de Estorno:**

| Campo | Descrição |
|-------|-----------|
| `id` | Identificador do ajuste |
| `eventId` | `id` do CloudEvent consumido |
| `pagamentoId` | Pagamento estornado na Arrecadação |
| `licencaId` | Licença vinculada ao pagamento |
| `rubricaSigla` | Rubrica afetada |
| `periodoOrigem` | Período da verba estornada |
| `valorEstornadoBruto` | Valor bruto recebido no evento |
| `valorAjusteLiquido` | Valor líquido a compensar na Distribuição |
| `justificativa` | Justificativa do estorno na Arrecadação |
| `estornadoPor` / `estornadoEm` | Autor e data do estorno |
| `processoOrigemId` | Processo que usou a verba antes do estorno, quando houver |
| `processoAplicacaoId` | Processo que aplicou ou prevê aplicar o ajuste |
| `status` | Estado do ajuste |

**Cálculo do valor líquido:**

O evento atual da Arrecadação envia `valorEstornado` bruto. No mcad, a verba líquida corresponde a 85% do bruto (10% ECAD + 5% associações). Portanto:

```text
valorAjusteLiquido = valorEstornadoBruto * 0.85
```

Essa decisão segue a simplificação global do `vision.md`. Se o contrato da Arrecadação passar a publicar `valorLiquidoEstornado`, a Tech Spec deve preferir o valor explícito do evento e manter compatibilidade retroativa.

**Estados do ajuste:**

```
PENDENTE_APLICACAO -> PREVISTO -> APLICADO
          ^             |
          |             v
          +--------- CANCELADO

IGNORADO_SEM_DISTRIBUICAO
PROCESSO_CRIADO_DESATUALIZADO
ERRO_INTEGRIDADE
```

| Estado | Quando ocorre |
|--------|---------------|
| `PENDENTE_APLICACAO` | Estorno afeta verba já usada em processo calculado, aprovado ou finalizado |
| `PREVISTO` | Ajuste foi incluído no cálculo de um processo ainda não finalizado |
| `APLICADO` | Processo de aplicação foi finalizado; ajuste tornou-se definitivo |
| `CANCELADO` | Processo de aplicação foi cancelado; o ajuste deve voltar a `PENDENTE_APLICACAO` ou registrar nova tentativa pendente |
| `IGNORADO_SEM_DISTRIBUICAO` | Não havia processo que tivesse usado a verba; o recálculo da Arrecadação e o snapshot atualizado resolvem o caso |
| `PROCESSO_CRIADO_DESATUALIZADO` | Já existe processo `CRIADO` para a rubrica+período, mas ele ainda não calculou créditos; o processo não pode calcular com snapshot de verba anterior ao estorno |
| `ERRO_INTEGRIDADE` | Há processo de origem, mas faltam créditos ou dados mínimos para alocar o ajuste |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-07 | Ao receber estorno, o sistema deve localizar processo não cancelado da mesma `rubricaSigla` e `periodoOrigem` | Must Have |
| RF-08 | Se o processo encontrado estiver `CALCULADO`, `APROVADO` ou `FINALIZADO`, criar ajuste `PENDENTE_APLICACAO` | Must Have |
| RF-09 | Se não existir processo para a rubrica+período, registrar o evento como `IGNORADO_SEM_DISTRIBUICAO` | Must Have |
| RF-10 | Se existir processo `CRIADO` para a rubrica+período, registrar o evento como `PROCESSO_CRIADO_DESATUALIZADO` e impedir cálculo com snapshot de verba anterior ao estorno | Must Have |
| RF-11 | O ajuste deve armazenar `valorEstornadoBruto` e `valorAjusteLiquido` com alta precisão decimal | Must Have |
| RF-12 | O sistema deve impedir dois ajustes ativos para o mesmo `pagamentoId` | Must Have |
| RF-13 | Ajustes em `ERRO_INTEGRIDADE` não devem ser aplicados automaticamente | Must Have |

**Critérios de Aceitação — RF-08:**
- **Given** existe processo `RADIO/2026-03` com status `CALCULADO`
- **When** chega estorno para `RADIO/2026-03`
- **Then** um ajuste `PENDENTE_APLICACAO` é criado com referência ao processo de origem

**Critérios de Aceitação — RF-09:**
- **Given** não existe processo para `TV_ABERTA/2026-03`
- **When** chega estorno para `TV_ABERTA/2026-03`
- **Then** o evento é registrado como `IGNORADO_SEM_DISTRIBUICAO`
- **And** nenhum ajuste financeiro fica pendente

**Critérios de Aceitação — RF-10:**
- **Given** existe processo `RADIO/2026-03` com status `CRIADO`
- **And** o processo referencia snapshot de verba anterior ao estorno
- **When** chega estorno para `RADIO/2026-03`
- **Then** o evento é registrado como `PROCESSO_CRIADO_DESATUALIZADO`
- **And** o cálculo desse processo é bloqueado até que ele seja recriado ou a Tech Spec implemente refresh explícito do snapshot de verba

### 3. Elegibilidade de Aplicação

Um ajuste pendente é aplicado no próximo processo elegível da mesma rubrica. O período de origem continua sendo o período afetado pelo estorno, mas o período de aplicação pode ser posterior quando o processo de origem já estiver finalizado, pois a regra atual de F02 impede novo processo não cancelado para a mesma rubrica+período.

**Regras de elegibilidade:**

| Condição | Regra |
|----------|-------|
| Rubrica | Deve ser a mesma `rubricaSigla` do ajuste |
| Status do ajuste | `PENDENTE_APLICACAO` |
| Processo de aplicação | Deve estar em cálculo, ainda em estado `CRIADO` |
| Processo concorrente | Ajuste não pode estar `PREVISTO` em outro processo ativo |
| Processo de origem finalizado | Aplicar apenas em período posterior ao `periodoOrigem` |
| Processo de origem cancelado/recriado | Pode aplicar em processo da mesma rubrica+período, desde que o processo antigo esteja `CANCELADO` |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | Ao calcular um processo, selecionar ajustes `PENDENTE_APLICACAO` elegíveis para a rubrica do processo | Must Have |
| RF-15 | Ajuste de processo de origem `FINALIZADO` só pode ser aplicado em processo de período posterior | Must Have |
| RF-16 | Ajuste não pode ser aplicado duas vezes, nem ficar previsto em dois processos ativos simultaneamente | Must Have |
| RF-17 | Se não houver ajustes elegíveis, o cálculo deve seguir normalmente com totais de ajuste zerados | Must Have |
| RF-18 | Ajustes devem ser aplicados em ordem de `estornadoEm` e, em empate, por `pagamentoId` | Should Have |

**Critérios de Aceitação — RF-14 + RF-15:**
- **Given** existe ajuste pendente de `RADIO/2026-03` cujo processo de origem está `FINALIZADO`
- **When** o Analista calcula processo `RADIO/2026-04`
- **Then** o ajuste é selecionado para aplicação prevista no processo `RADIO/2026-04`

**Critérios de Aceitação — RF-16:**
- **Given** um ajuste já está `PREVISTO` em processo `RADIO/2026-04`
- **When** outro processo tenta calcular para `RADIO`
- **Then** esse ajuste não é selecionado até o processo anterior ser finalizado ou cancelado

### 4. Alocação do Ajuste em Linhas Financeiras

A aplicação do ajuste deve gerar linhas negativas proporcionais aos créditos do processo de origem. Isso preserva a mesma distribuição relativa usada no cálculo que será compensado.

**Regra de alocação:**

```text
valorAjusteTitular = valorAjusteLiquido * (valorCreditoOrigem / totalCreditosOrigem)
```

As linhas devem ser negativas no contexto do demonstrativo e do resumo do processo. O algoritmo deve usar `BigDecimal`, arredondamento determinístico e alocação de resíduo para garantir que a soma das linhas seja exatamente `valorAjusteLiquido * -1`.

**Dados de cada linha de ajuste:**

| Campo | Origem |
|-------|--------|
| `ajusteId` | Ajuste de estorno |
| `processoOrigemId` | Processo que calculou créditos antes do estorno |
| `processoAplicacaoId` | Processo que aplica o ajuste |
| `creditoOrigemId` | Crédito usado como base proporcional |
| `titularId` / `titularNome` | Crédito de origem |
| `obraId` / `obraTitulo` | Crédito de origem |
| `fonogramaId` | Crédito de origem, quando houver |
| `categoria` / `subcategoriaConexa` | Crédito de origem |
| `valorAjuste` | Valor negativo alocado |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-19 | A aplicação deve gerar linhas negativas por crédito de origem, proporcionais ao valor original do crédito | Must Have |
| RF-20 | A soma das linhas negativas deve fechar exatamente com `valorAjusteLiquido * -1` | Must Have |
| RF-21 | Linhas de ajuste devem manter titular, obra, fonograma e categoria do crédito de origem | Must Have |
| RF-22 | O ajuste não deve recalcular split autoral/conexo nem consultar Cadastro novamente para o processo de origem | Must Have |
| RF-23 | Se o processo de origem não tiver créditos válidos para alocação, o ajuste deve ir para `ERRO_INTEGRIDADE` | Must Have |
| RF-24 | O valor dos créditos positivos do processo atual não deve ser recalculado por causa do ajuste; o ajuste entra como seção financeira separada | Must Have |

**Critérios de Aceitação — RF-19 + RF-20:**
- **Given** o processo de origem tem dois créditos: R$ 600,00 e R$ 400,00
- **And** o ajuste líquido é R$ 85,00
- **When** o ajuste é aplicado
- **Then** são geradas duas linhas negativas: R$ -51,00 e R$ -34,00
- **And** a soma das linhas é R$ -85,00

**Critérios de Aceitação — RF-24:**
- **Given** o processo atual tem verba líquida de R$ 10.000,00
- **And** há ajuste de estorno de R$ 850,00
- **When** o cálculo é consultado
- **Then** os créditos positivos continuam rateados sobre R$ 10.000,00
- **And** o resumo mostra ajuste total de R$ -850,00 em seção separada

### 5. Efetivação e Cancelamento pela Máquina de Estados

Assim como a liberação de créditos retidos (F05), a aplicação do ajuste só se torna definitiva na finalização do processo. Enquanto o processo está `CALCULADO` ou `APROVADO`, a aplicação é apenas prevista.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-25 | Ao calcular processo com ajustes elegíveis, marcar os ajustes como `PREVISTO` e vincular `processoAplicacaoId` | Must Have |
| RF-26 | Ao finalizar o processo, transicionar ajustes previstos para `APLICADO` | Must Have |
| RF-27 | Ao cancelar processo com ajustes previstos, cancelar a previsão e disponibilizar os ajustes novamente como `PENDENTE_APLICACAO` | Must Have |
| RF-28 | Processo finalizado não pode ter aplicação de ajuste revertida | Must Have |
| RF-29 | Eventos de processo (`distribuicao.processo.finalizado` e `.cancelado`) devem refletir os totais de ajuste quando aplicável | Should Have |

**Critérios de Aceitação — RF-25 + RF-26:**
- **Given** um processo calculado possui dois ajustes previstos
- **When** o Analista finaliza o processo
- **Then** os ajustes ficam `APLICADO`
- **And** cada ajuste recebe `aplicadoEm`

**Critérios de Aceitação — RF-27:**
- **Given** um processo possui ajuste `PREVISTO`
- **When** o Analista cancela o processo
- **Then** a previsão é cancelada
- **And** o ajuste volta a ficar elegível em processo futuro

### 6. Consulta, API e Experiência do Usuário

F06 deve expor ajustes para consulta operacional e incluir os totais no contrato da tela de cálculo.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-30 | Criar endpoint de listagem de ajustes com filtros por rubrica, período de origem, status e pagamentoId | Must Have |
| RF-31 | Criar endpoint de detalhe de ajuste com payload original, processo de origem e histórico de aplicação | Should Have |
| RF-32 | `GET /api/v1/processos/{id}/calculo` deve retornar totais de ajustes de estorno no resumo | Must Have |
| RF-33 | `GET /api/v1/processos/{id}/calculo` deve retornar seção/lista de linhas de ajuste aplicadas ou previstas | Must Have |
| RF-34 | Tela de cálculo deve exibir card com `valorTotalAjustesEstorno` e contagem de ajustes | Must Have |
| RF-35 | Tela de cálculo deve exibir tabela de ajustes com pagamento, período de origem, justificativa, valor bruto, valor líquido e status | Must Have |
| RF-36 | Tela de listagem de ajustes deve ser somente leitura | Should Have |

**Critérios de Aceitação — RF-32 + RF-33:**
- **Given** um processo possui ajuste previsto de R$ -850,00
- **When** o Analista abre a tela de cálculo
- **Then** o resumo exibe `valorTotalAjustesEstorno=-850.00`
- **And** a seção de ajustes lista pagamento, justificativa e linhas por titular

### 7. Eventos da Distribuição

A feature deve publicar eventos próprios para que Analytics e auditorias futuras não precisem consultar o banco transacional da Distribuição.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-37 | Ao registrar ajuste `PENDENTE_APLICACAO`, publicar `distribuicao.ajuste.estorno.registrado` via Outbox | Should Have |
| RF-38 | Ao finalizar processo com ajuste aplicado, publicar `distribuicao.ajuste.estorno.aplicado` via Outbox | Must Have |
| RF-39 | Eventos devem seguir CloudEvents 1.0 e usar `pagamentoId`/`ajusteId` como dados de idempotência | Must Have |
| RF-40 | Redelivery da outbox pode republicar eventos; consumidores devem tratar `id` do CloudEvent | Must Have |

**Payload mínimo de `distribuicao.ajuste.estorno.aplicado`:**

```json
{
  "ajusteId": "uuid",
  "pagamentoId": "uuid",
  "licencaId": "uuid",
  "rubricaSigla": "RADIO",
  "periodoOrigem": "2026-03",
  "periodoAplicacao": "2026-04",
  "processoOrigemId": "uuid",
  "processoAplicacaoId": "uuid",
  "valorEstornadoBruto": "1000.00",
  "valorAjusteLiquido": "850.00",
  "valorAplicado": "-850.00",
  "totalLinhas": 12,
  "estornadoPor": "analista.arrecadacao@ecad.org.br",
  "estornadoEm": "2026-05-20T10:00:00Z",
  "aplicadoEm": "2026-05-20T12:00:00Z"
}
```

---

## Experiência do Usuário

### Fluxo Principal — Estorno com Ajuste Pendente
1. Arrecadação estorna pagamento e publica `arrecadacao.pagamento.estornado`
2. Distribuição consome o evento e registra ajuste pendente
3. Analista acessa "Distribuição" → "Ajustes por Estorno"
4. Sistema lista ajuste pendente com rubrica, período de origem, pagamento, justificativa e valor líquido
5. No próximo processo elegível da rubrica, o cálculo inclui o ajuste como previsão
6. Tela de cálculo exibe créditos positivos e seção separada de ajustes negativos
7. Ao finalizar o processo, o ajuste vira `APLICADO`

### Fluxo Alternativo — Estorno Antes de Distribuição
1. Arrecadação estorna pagamento antes de existir processo calculado na Distribuição
2. Se não existe processo, Distribuição registra evento como `IGNORADO_SEM_DISTRIBUICAO`
3. Se existe processo `CRIADO` com snapshot anterior, Distribuição registra `PROCESSO_CRIADO_DESATUALIZADO` e bloqueia o cálculo até refresh/recriação
4. Snapshot de verba atualizado pela Arrecadação passa a refletir a nova verba líquida
5. Nenhum ajuste financeiro é aplicado para evitar dupla compensação

### Considerações de UI
- Ajustes são somente leitura; não há criação ou edição manual no frontend
- Badges: `PENDENTE_APLICACAO`, `PREVISTO`, `APLICADO`, `IGNORADO_SEM_DISTRIBUICAO`, `PROCESSO_CRIADO_DESATUALIZADO`, `ERRO_INTEGRIDADE`
- Valores de ajuste devem aparecer como negativos na tela de cálculo e no demonstrativo futuro
- A justificativa do estorno deve ser visível, mas truncada em tabela com detalhe completo no drawer/página
- Se houver ajuste em `ERRO_INTEGRIDADE`, exibir alerta operacional no detalhe do ajuste

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot no serviço `distribuicao-api`
- Dados no schema `distribuicao` do PostgreSQL
- Consumo de eventos do RabbitMQ com garantia at-least-once e idempotência no consumidor
- Publicação via Outbox Pattern já existente no domínio Distribuição
- Formato CloudEvents 1.0 nos eventos consumidos e publicados
- Valores monetários sempre com `BigDecimal`; nunca `float`/`double`
- Sem join cross-schema com Arrecadação ou Cadastro
- Sem chamada HTTP à Arrecadação para enriquecer estorno; o evento é o contrato
- Frontend React + Vite, reaproveitando padrões do módulo `features/distribuicao/processos`
- Authz pelo `authz-spring-boot-starter` com `@RequiresPermission`; não usar checagem local de roles
- Auditoria pelo `audit-sdk` já integrado ao serviço

---

## Permissionamento (ecad-authz)

F06 não cria endpoints de escrita acionados por usuário. O registro e a aplicação de ajustes são ações do sistema ou parte do comando de cálculo/finalização de processo. Endpoints de consulta devem seguir a convenção de 4 segmentos `dominio:area:recurso:acao`.

| key | name | Endpoint(s) | Perfil-base sugerido |
|---|---|---|---|
| `distribuicao:default:ajuste:listar` | Listar ajustes por estorno | `GET /ajustes-estorno` | consultor, analista |
| `distribuicao:default:ajuste:visualizar` | Visualizar ajuste por estorno | `GET /ajustes-estorno/{id}` | consultor, analista |
| `distribuicao:default:processo:visualizar` | Visualizar ajustes no cálculo | `GET /processos/{id}/calculo` | consultor, analista |
| `distribuicao:default:processo:calcular` | Prever aplicação de ajuste | `POST /processos/{id}/calcular` | analista |
| `distribuicao:default:processo:finalizar` | Efetivar aplicação de ajuste | `POST /processos/{id}/finalizar` | analista |
| `distribuicao:default:processo:cancelar` | Cancelar previsão de ajuste | `POST /processos/{id}/cancelar` | analista |

A proteção real é no backend. O frontend deve esconder telas/ações conforme permissões recebidas do BFF, seguindo ADR 0004.

---

## Auditoria (audit-sdk)

O consumo de `arrecadacao.pagamento.estornado` é evento sistêmico e não gera `userAction` local, pois a ação humana ocorreu na Arrecadação e já deve estar auditada naquele domínio.

F06 deve estender a auditoria dos comandos já existentes:

| Ação | Auditoria esperada |
|------|--------------------|
| Calcular processo com ajustes | `dataChange.after` do cálculo inclui `totalAjustesEstorno` e `valorTotalAjustesEstorno` |
| Finalizar processo com ajustes | `dataChange.after` da finalização inclui ajustes efetivados |
| Cancelar processo com ajustes previstos | `dataChange.after` do cancelamento inclui ajustes devolvidos para pendência |

### Critérios de Aceitação — Auditoria

- **RF-AUD-01:** calcular processo com ajuste previsto grava auditoria com totais de ajuste.
- **RF-AUD-02:** finalizar processo com ajuste aplicado grava auditoria com ids dos ajustes efetivados.
- **RF-AUD-03:** cancelar processo com ajuste previsto grava auditoria indicando que a previsão foi revertida.

---

## Não-Objetivos (Fora de Escopo)

- Criar ou autorizar estorno de pagamento; isso pertence à Arrecadação (D03 F06)
- Estorno parcial; a Arrecadação já define estorno total
- Ajuste manual criado pelo Analista de Distribuição
- Reabrir ou alterar processo `FINALIZADO`
- Recalcular créditos do processo de origem
- Alterar o contrato de `arrecadacao.pagamento.estornado`
- Corrigir lacunas de lock `distribuicao.processo.iniciado`; F06 apenas compensa eventos recebidos
- Corrigir a lacuna de atualização/no-op de snapshots de Verba existentes, exceto se a Tech Spec decidir reaproveitar o mesmo ponto de consumo
- Demonstrativo final por titular; F07 consome os dados gerados aqui
- Pagamento efetivo, cobrança ou recuperação financeira real fora da PoC

---

## Rastreabilidade

### Vision Doc
- **Fase:** Fase 3 — Distribuição
- **Objetivo atendido:** completar o processo de distribuição com compensação por estorno antes do demonstrativo
- **Glossário:** Ajuste, Crédito, Processo de Distribuição, Verba Líquida, Rubrica
- **Restrição global:** Schema-per-Service, RabbitMQ, Event-Driven, PoC auto-contida
- **Simplificação:** sem pagamento real e sem integração externa

### Domain Doc (Distribuição — D04)
- **Feature:** F06 — Ajustes por Estorno
- **Entidade:** Ajuste
- **Regra referenciada:** RN-07 — estorno de pagamento após distribuição calculada gera ajuste aplicado em processo futuro
- **Dependência upstream:** Arrecadação — evento `arrecadacao.pagamento.estornado`
- **Dependência interna:** F02 Gestão de Processos, F03 Cálculo de Créditos, F04 Retenção, F05 Liberação
- **Dependência downstream:** F07 Demonstrativo de Créditos
- **Eventos consumidos:** `arrecadacao.pagamento.estornado`
- **Eventos produzidos:** `distribuicao.ajuste.estorno.registrado`, `distribuicao.ajuste.estorno.aplicado`
- **Ordem de implementação:** sexta feature do domínio, antes de demonstrativos

### Domain Doc (Arrecadação — D03)
- **Feature relacionada:** F06 — Estorno de Pagamento
- **Evento produzido:** `arrecadacao.pagamento.estornado`
- **Contrato real:** `infra/schemas/v1/ArrecadacaoPagamentoEstornado.json`
- **Observação:** o evento atual traz valor bruto; o valor líquido do ajuste é derivado pela regra global de 85%.

---

## Questões Resolvidas

| Questão | Decisão |
|---------|---------|
| O evento de estorno sempre gera ajuste financeiro? | Não. Sem processo, o evento é `IGNORADO_SEM_DISTRIBUICAO`; com processo apenas `CRIADO`, o evento é `PROCESSO_CRIADO_DESATUALIZADO` e bloqueia cálculo com snapshot antigo. |
| O ajuste altera processo finalizado? | Não. Processo finalizado é irreversível; ajuste é compensado em processo futuro. |
| O período de aplicação é sempre igual ao período de origem? | Não necessariamente. O período de origem identifica a verba afetada; se o processo de origem já foi finalizado, a aplicação ocorre em período posterior da mesma rubrica. |
| Como obter valor líquido se o evento traz valor bruto? | Aplicar a regra da PoC: `valorEstornadoBruto * 0.85`. |
| A aplicação é definitiva no cálculo? | Não. No cálculo fica `PREVISTO`; só vira `APLICADO` na finalização. |
| Ajustes entram misturados aos créditos atuais? | Não. Créditos positivos do período atual e ajustes negativos ficam em seções separadas. |
| Demonstrativo é entregue nesta feature? | Não. F06 gera os dados; F07 monta o demonstrativo. |

PRD pronto para Tech Spec.

---

*PRD gerado seguindo o padrão de `flow-prd-creator`. Para gerar a Especificação Técnica, use este PRD junto com `vision.md` e `domains/distribuicao/domain.md` como contexto.*
