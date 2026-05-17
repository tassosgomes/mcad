# PRD — F04: Retenção de Créditos

> **Domínio:** Distribuição (D04)
> **Feature ID:** F04
> **Prioridade:** Must Have
> **Status:** `implemented`
> **Data:** 2026-05-17
> **Revisão:** 2026-05-17 — implementado no backend `distribuicao-api` e na tela de cálculo do frontend; criado originalmente a partir do `vision.md`, do `domains/distribuicao/domain.md` e do padrão estrutural de `tasks/cadastro/prd-eventos-cadastro/prd.md`.

---

## Status de Implementação

Implementação confirmada no código em 2026-05-17.

Escopo implementado:

- mapeamento de `status` de obra/fonograma e `associacaoSigla` no ownership snapshot do Cadastro;
- classificação automática de créditos como `CALCULADO` ou `RETIDO` durante o cálculo;
- motivos `OBRA_PENDENTE`, `OBRA_BLOQUEADA` e `TITULAR_SEM_ASSOCIACAO`, com precedência por status da obra;
- persistência de `motivo_retencao`, `retido_em`, `total_creditos_retidos` e `valor_total_retido`;
- filtros de consulta por `status` e `motivoRetencao` em `GET /api/v1/processos/{id}/calculo`;
- evento `distribuicao.credito.retido` via outbox, um por crédito retido;
- auditoria, métricas e logs com totais de retenção;
- frontend com resumo de retenção, filtros de status/motivo e coluna de motivo na tabela de créditos.

Verificações executadas:

- `rtk mvn -pl distribuicao-tests -am -Dtest=CalculadoraCreditosTest,CalcularProcessoCommandHandlerTest,ConsultarCalculoProcessoQueryHandlerTest,JpaCreditoRepositoryTest,HttpCadastroOwnershipClientTest -Dsurefire.failIfNoSpecifiedTests=false test`;
- `rtk npm test -- src/features/distribuicao/processos/api/processosCalculoApi.test.ts src/features/distribuicao/processos/components/CalculoSummary.test.tsx src/features/distribuicao/processos/components/CreditosFilters.test.tsx src/features/distribuicao/processos/components/CreditosTable.test.tsx src/features/distribuicao/processos/utils/calculoFormatters.test.ts`.

## Visão Geral

Retenção de Créditos é a feature que fecha a primeira lacuna pós-cálculo do domínio Distribuição. A F03 já calcula créditos por titular cruzando Rol de Execuções, Verba Líquida e ownership snapshot do Cadastro; porém todo crédito gerado hoje fica com status `CALCULADO`, mesmo quando há pendência cadastral que impede a distribuição efetiva.

Esta feature estende o cálculo para classificar automaticamente créditos como `RETIDO` quando a obra está `PENDENTE` ou `BLOQUEADA`, ou quando o titular do crédito não possui associação vinculada no Cadastro. O valor continua calculado e rastreável, mas fica marcado como indisponível para distribuição até a F05 liberar retidos.

A retenção é uma regra de negócio automática, executada durante o cálculo do processo. Não há ação manual nova para o Analista nesta feature; o usuário passa a enxergar, na tela de cálculo, quais créditos foram retidos, por qual motivo e qual valor ficou bloqueado.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Reter automaticamente créditos com pendência cadastral | 100% dos créditos afetados por obra pendente/bloqueada ou titular sem associação têm status `RETIDO` |
| Preservar rastreabilidade monetária | Valor do crédito retido é persistido com processo, obra, titular, motivo e data da retenção |
| Preparar a liberação de retidos | Cada crédito retido contém dados suficientes para F05 reavaliar a pendência no Cadastro |
| Expor retenções ao Analista | Tela de cálculo mostra totais e lista filtrável de créditos retidos |
| Publicar evento de retenção | Todo crédito retido gera evento `distribuicao.credito.retido` via Outbox Pattern |

---

## Histórias de Usuário

### HU-01 — Cálculo retém crédito de obra pendente ou bloqueada
**Como** sistema de Distribuição,
**eu preciso** identificar créditos ligados a obras com status `PENDENTE` ou `BLOQUEADA`,
**para que** valores de repertório ainda não liberado não sejam tratados como distribuíveis.

### HU-02 — Cálculo retém crédito de titular sem associação
**Como** sistema de Distribuição,
**eu preciso** identificar créditos de titulares sem associação vinculada,
**para que** o valor seja calculado, mas fique bloqueado até a regularização cadastral.

### HU-03 — Analista visualiza retenções no processo
**Como** Analista de Distribuição,
**eu quero** ver quantos créditos foram retidos, o valor total retido e o motivo de cada retenção,
**para que** eu possa revisar o resultado do cálculo antes de aprovar o processo.

### HU-04 — F05 encontra retidos elegíveis para liberação
**Como** feature de Liberação de Créditos Retidos,
**eu preciso** consultar os créditos retidos com motivo, dados cadastrais e processo de origem,
**para que** eu possa reavaliar as pendências no Cadastro em um novo processo.

### HU-05 — Analytics recebe retenções
**Como** consumidor analítico futuro,
**eu preciso** receber eventos de crédito retido,
**para que** dashboards possam mostrar valor retido por rubrica, período, motivo e titular sem consultar o banco da Distribuição.

---

## Funcionalidades Principais

### 1. Enriquecimento do Ownership Snapshot do Cadastro

O Cadastro já expõe `POST /api/v1/distribuicao/ownership-snapshot` com status de obra/fonograma e `associacaoSigla` dos titulares. A Distribuição deve passar a consumir esses campos no ACL existente, sem criar chamadas HTTP adicionais.

**Campos necessários no snapshot:**

| Entidade | Campo | Uso na retenção |
|----------|-------|-----------------|
| Obra | `status` | Retém créditos quando `PENDENTE` ou `BLOQUEADA` |
| Titularidade autoral | `associacaoSigla` | Retém crédito autoral quando ausente |
| Participação conexa | `associacaoSigla` | Retém crédito conexo quando ausente |
| Fonograma | `status` | Persistido no snapshot interno para rastreabilidade; não é motivo de retenção nesta feature |

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | A Distribuição deve mapear `status` da obra no `ObraOwnership` usado pelo cálculo | Must Have |
| RF-02 | A Distribuição deve mapear `associacaoSigla` em cada participação autoral e conexa | Must Have |
| RF-03 | A Distribuição deve mapear `status` do fonograma para rastreabilidade do snapshot interno | Should Have |
| RF-04 | O ACL deve continuar consultando o Cadastro em batch por `obraIds` e `fonogramaIds`, sem chamada por crédito/titular | Must Have |
| RF-05 | Se o Cadastro retornar resposta com ausência de campos obrigatórios no contrato (`status` de obra ou `associacaoSigla` na participação), o cálculo deve falhar com erro de pré-requisito/integridade de contrato. `associacaoSigla=null` é valor válido e indica retenção por titular sem associação | Must Have |

**Critérios de Aceitação — RF-01 + RF-02:**
- **Given** o Cadastro retorna uma obra `PENDENTE` com uma titularidade de titular associado à UBC
- **When** a Distribuição mapeia o ownership snapshot
- **Then** o cálculo recebe `status=PENDENTE` na obra e `associacaoSigla=UBC` na participação

**Critérios de Aceitação — RF-04:**
- **Given** um Rol contém 100 execuções de 20 obras e 15 fonogramas
- **When** o cálculo consulta o Cadastro
- **Then** a Distribuição faz uma única chamada batch ao endpoint de ownership snapshot, com IDs distintos

### 2. Regras de Retenção no Cálculo

A calculadora de créditos deve continuar gerando o mesmo valor por titular, categoria e obra/fonograma, mas definir o status final do crédito conforme as pendências cadastrais.

**Motivos de retenção:**

| Motivo | Condição | Aplicação |
|--------|----------|-----------|
| `OBRA_PENDENTE` | Obra do crédito está com status `PENDENTE` | Créditos autorais e conexos da obra |
| `OBRA_BLOQUEADA` | Obra do crédito está com status `BLOQUEADA` | Créditos autorais e conexos da obra |
| `TITULAR_SEM_ASSOCIACAO` | Titular do crédito tem `associacaoSigla` nula ou vazia | Apenas o crédito daquele titular |

**Precedência quando há mais de uma pendência:**
1. `OBRA_BLOQUEADA`
2. `OBRA_PENDENTE`
3. `TITULAR_SEM_ASSOCIACAO`

A precedência define o motivo principal persistido. A F05 deve reavaliar todos os pré-requisitos no Cadastro antes de liberar o crédito, portanto armazenar um único motivo principal não libera indevidamente créditos com pendências secundárias.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-06 | Expandir `StatusCredito` para incluir `RETIDO`, mantendo `CALCULADO` para créditos sem pendência | Must Have |
| RF-07 | Crédito ligado a obra `PENDENTE` deve ser persistido com status `RETIDO` e motivo `OBRA_PENDENTE` | Must Have |
| RF-08 | Crédito ligado a obra `BLOQUEADA` deve ser persistido com status `RETIDO` e motivo `OBRA_BLOQUEADA` | Must Have |
| RF-09 | Crédito de titular sem associação deve ser persistido com status `RETIDO` e motivo `TITULAR_SEM_ASSOCIACAO` | Must Have |
| RF-10 | Crédito sem pendência deve continuar sendo persistido com status `CALCULADO` | Must Have |
| RF-11 | O valor monetário do crédito retido deve ser calculado exatamente pelo mesmo algoritmo de F03; retenção muda o status, não o valor | Must Have |
| RF-12 | Obras com status `DEPURADA` ou `DOMINIO_PUBLICO` devem falhar como pré-requisito de cálculo, não gerar retenção | Must Have |
| RF-13 | Fonograma pendente/bloqueado não é motivo adicional de retenção nesta PoC; a regra contratada é status da obra + associação do titular | Must Have |

**Critérios de Aceitação — RF-07:**
- **Given** o Rol contém execução de uma obra com status `PENDENTE`
- **When** o Analista calcula o processo
- **Then** todos os créditos gerados para a obra são persistidos com `status=RETIDO`, `motivoRetencao=OBRA_PENDENTE` e `valorCredito` calculado normalmente

**Critérios de Aceitação — RF-08:**
- **Given** o Rol contém execução de uma obra com status `BLOQUEADA`
- **When** o Analista calcula o processo
- **Then** todos os créditos gerados para a obra são persistidos com `status=RETIDO`, `motivoRetencao=OBRA_BLOQUEADA` e `retidoEm` preenchido

**Critérios de Aceitação — RF-09:**
- **Given** uma obra está `LIBERADA`, mas um dos titulares não possui associação
- **When** o cálculo gera créditos para a obra
- **Then** apenas o crédito do titular sem associação fica `RETIDO`; os demais titulares elegíveis ficam `CALCULADO`

**Critérios de Aceitação — RF-11:**
- **Given** a verba da obra é R$ 1.000,00 e o titular pendente teria direito a 40%
- **When** o crédito é retido
- **Then** o `valorCredito` persistido é R$ 400,00, com status `RETIDO`

**Critérios de Aceitação — RF-12:**
- **Given** o Rol contém obra `DOMINIO_PUBLICO`
- **When** o Analista tenta calcular o processo
- **Then** o cálculo é rejeitado com erro de pré-requisito indicando que a obra não é distribuível

### 3. Persistência e Resumo do Cálculo

A entidade `Credito` deve representar créditos calculados e retidos. Não há necessidade de tabela separada para F04; o status e os campos de retenção tornam o crédito distinguível e preparável para F05.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | Adicionar `motivo_retencao` nullable na tabela `distribuicao.creditos` | Must Have |
| RF-15 | Adicionar `retido_em` nullable na tabela `distribuicao.creditos` | Must Have |
| RF-16 | `motivo_retencao` e `retido_em` devem ser obrigatórios quando `status=RETIDO` | Must Have |
| RF-17 | `motivo_retencao` e `retido_em` devem ser nulos quando `status=CALCULADO` | Must Have |
| RF-18 | O processo deve armazenar `total_creditos_retidos` e `valor_total_retido` no resumo do cálculo | Must Have |
| RF-19 | O evento `distribuicao.processo.calculado` deve incluir totais de retenção no payload | Should Have |
| RF-20 | Recalcular um processo em `CRIADO` deve continuar idempotente: remove créditos anteriores do processo e recria créditos calculados/retidos conforme snapshot atual | Must Have |

**Critérios de Aceitação — RF-16 + RF-17:**
- **Given** o cálculo gerou um crédito retido e um crédito calculado
- **When** os registros são persistidos
- **Then** o crédito retido tem `motivo_retencao` e `retido_em` preenchidos
- **And** o crédito calculado tem `motivo_retencao` e `retido_em` nulos

**Critérios de Aceitação — RF-18:**
- **Given** um processo gerou 10 créditos, sendo 3 retidos somando R$ 1.250,00
- **When** o resumo do cálculo é consultado
- **Then** retorna `totalCreditos=10`, `totalCreditosRetidos=3` e `valorTotalRetido=1250.00`

### 4. Eventos de Retenção

Cada crédito retido deve publicar um evento de domínio para consumidores futuros, especialmente Analytics e a própria evolução de demonstrativos. A publicação usa a infraestrutura de Outbox já existente na Distribuição.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | Para cada crédito retido, salvar um evento `distribuicao.credito.retido` na outbox na mesma transação do cálculo | Must Have |
| RF-22 | O payload deve conter `creditoId`, `processoId`, `rubricaSigla`, `periodo`, `titularId`, `titularNome`, `obraId`, `obraTitulo`, `fonogramaId`, `categoria`, `subcategoriaConexa`, `valorCredito`, `motivoRetencao`, `retidoEm` | Must Have |
| RF-23 | O evento deve seguir o formato CloudEvents usado pelo domínio Distribuição | Must Have |
| RF-24 | Reexecução do worker de outbox pode publicar o evento mais de uma vez; consumers devem tratar `id` do evento como idempotência | Must Have |

**Exemplo de payload de `data`:**

```json
{
  "creditoId": "1b2f7f61-b2ac-4c69-81b5-85f6e8c1b553",
  "processoId": "4e5af094-81b8-404e-8324-82b795395d2c",
  "rubricaSigla": "RADIO",
  "periodo": "2026-03",
  "titularId": "9f0fdd3f-b4b1-4f51-bac1-62379d230e9a",
  "titularNome": "Maria Compositora",
  "obraId": "2f897625-0a2f-4f9c-9e7c-c21b9e4b34a5",
  "obraTitulo": "Meu Bem Querer",
  "fonogramaId": null,
  "categoria": "AUTORAL",
  "subcategoriaConexa": null,
  "valorCredito": 400.00,
  "motivoRetencao": "TITULAR_SEM_ASSOCIACAO",
  "retidoEm": "2026-05-17T14:30:00Z"
}
```

**Critérios de Aceitação — RF-21:**
- **Given** o cálculo gerou 2 créditos retidos
- **When** a transação do cálculo é concluída
- **Then** existem 2 eventos `distribuicao.credito.retido` na outbox, um por crédito retido

### 5. Consulta e Experiência do Usuário

A tela de cálculo existente deve mostrar retenções sem criar um fluxo operacional separado.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-25 | `GET /api/v1/processos/{id}/calculo` deve retornar `totalCreditosRetidos` e `valorTotalRetido` no resumo | Must Have |
| RF-26 | A lista de créditos deve retornar `motivoRetencao` e `retidoEm` por item | Must Have |
| RF-27 | A API de créditos do cálculo deve permitir filtro por `status` (`CALCULADO`, `RETIDO`) | Must Have |
| RF-28 | A API de créditos do cálculo deve permitir filtro por `motivoRetencao` | Should Have |
| RF-29 | A tela de cálculo deve exibir cards/resumo com total de créditos, total retido, valor calculado e valor retido | Must Have |
| RF-30 | A tabela de créditos deve exibir badge de status e coluna de motivo quando houver créditos retidos | Must Have |
| RF-31 | A tela deve permitir filtrar créditos por status e motivo de retenção | Should Have |

**Critérios de Aceitação — RF-25 + RF-26:**
- **Given** um processo calculado possui créditos retidos
- **When** o Analista acessa a tela de cálculo
- **Then** o resumo mostra o total/valor retido e a tabela mostra o motivo de cada crédito retido

**Critérios de Aceitação — RF-27:**
- **Given** um processo possui créditos `CALCULADO` e `RETIDO`
- **When** o cliente consulta `/api/v1/processos/{id}/calculo?status=RETIDO`
- **Then** a resposta retorna apenas créditos com status `RETIDO`

### 6. Permissionamento e Auditoria

F04 não introduz endpoints de escrita novos. A retenção acontece dentro do comando de cálculo já protegido por `distribuicao:default:processo:calcular`.

#### Requisitos Funcionais

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-32 | Nenhuma permissão nova é necessária para calcular retenções; usar `distribuicao:default:processo:calcular` no comando existente | Must Have |
| RF-33 | Consultar retenções usa a permissão existente `distribuicao:default:processo:visualizar` | Must Have |
| RF-34 | O evento de auditoria do cálculo deve incluir `totalCreditosRetidos` e `valorTotalRetido` no `dataChange.after` | Must Have |
| RF-35 | Eventos de retenção gerados pelo sistema não exigem `userAction` separado; a ação auditada é o cálculo iniciado pelo Analista | Must Have |

---

## Experiência do Usuário

### Fluxo Principal — Calcular com Retenção
1. Analista abre um processo no estado `CRIADO`
2. Clica em "Calcular"
3. Sistema consulta o ownership snapshot do Cadastro
4. Sistema calcula todos os créditos e classifica cada um como `CALCULADO` ou `RETIDO`
5. Tela de cálculo exibe resumo com valor total calculado, créditos retidos e valor retido
6. Analista revisa a tabela e pode filtrar por créditos retidos antes de aprovar

### Considerações de UI
- Usar badge de status para `CALCULADO` e `RETIDO`
- Exibir motivo de retenção em texto curto: "Obra pendente", "Obra bloqueada", "Titular sem associação"
- Não criar botão de "Liberar" nesta feature
- Não esconder créditos retidos por padrão; eles fazem parte do resultado do cálculo
- O valor retido deve aparecer como subtotais no resumo, não como desconto do valor calculado

---

## Restrições Técnicas de Alto Nível

- **Stack:** Java Spring Boot no serviço `distribuicao-api`
- Dados no schema `distribuicao` do PostgreSQL
- Sem joins cross-schema; dados cadastrais vêm somente pelo ACL HTTP do Cadastro
- Cálculo e eventos de retenção devem ocorrer na mesma transação do comando `CalcularProcessoCommandHandler`
- Publicação via Outbox Pattern já existente no domínio Distribuição
- Formato CloudEvents nos eventos publicados
- Valores monetários e percentuais sempre com `BigDecimal`; nunca `float`/`double`
- Frontend React + Vite, reaproveitando a tela de cálculo do módulo Distribuição
- Authz pelo `authz-spring-boot-starter` com `@RequiresPermission`; não usar checagem local de roles
- Auditoria pelo `audit-sdk` já integrado no serviço

---

## Não-Objetivos (Fora de Escopo)

- Liberar créditos retidos quando a pendência for resolvida — entregue separadamente na F05
- Tela/ação manual de liberação de retidos
- Prescrição de créditos retidos após 5 anos
- Ajustes por estorno de pagamento — F06
- Demonstrativo de créditos — F07
- Pagamento efetivo aos titulares
- Retenção por status de fonograma como regra adicional nesta PoC
- Corrigir contratos de período (`YYYY-MM-DD` vs `YYYY-MM`) entre Identificação, Arrecadação e Distribuição
- Alterar regras de Cadastro ou criar telas cadastrais para regularização
- Recalcular processo já `CALCULADO`, `APROVADO` ou `FINALIZADO`

---

## Rastreabilidade

### Vision Doc
- **Fase:** Fase 3 — Distribuição
- **Objetivo atendido:** Implementar retenção de créditos pendentes como parte do processo completo de distribuição
- **Glossário:** Crédito Retido — crédito bloqueado por pendência cadastral
- **Restrição global:** Schema-per-Service, RabbitMQ, Event-Driven, PoC auto-contida
- **Simplificação:** Prescrição de créditos retidos fora do escopo

### Domain Doc (Distribuição — D04)
- **Feature:** F04 — Retenção de Créditos
- **Entidades:** Crédito, Crédito Retido, Processo de Distribuição
- **Regra referenciada:** RN-05 — Crédito é retido quando a obra está PENDENTE/BLOQUEADA ou quando o titular não possui associação vinculada
- **Regra relacionada:** RN-06 — Créditos retidos são liberados em processo futuro quando a pendência for resolvida
- **Dependência upstream:** Cadastro — status de obras e vínculo titular-associação via ownership snapshot
- **Dependência interna:** F03 — Cálculo de Créditos já implementado
- **Evento produzido:** `distribuicao.credito.retido`
- **Ordem de implementação:** Quarta feature do domínio, após cálculo de créditos

---

## Questões em Aberto

Todas as questões funcionais deste PRD foram resolvidas:

| Questão | Decisão |
|---------|---------|
| Retenção é manual ou automática? | Automática durante o cálculo |
| Retenção altera o valor do crédito? | Não; apenas status, motivo e data |
| Crédito retido fica na mesma tabela de créditos? | Sim, via `status=RETIDO` + campos de retenção |
| Status de fonograma retém crédito nesta PoC? | Não; F04 implementa apenas RN-05 |
| Liberação de retidos entra neste PRD? | Não; foi entregue separadamente na F05 |

PRD implementado. Manter este documento como referência funcional da F04 e usar `tasks/distribuicao/prd-liberacao-creditos-retidos/prd.md` para o ciclo de liberação.

---

*Para evoluções futuras, use este PRD junto com `vision.md`, `domains/distribuicao/domain.md` e a Tech Spec correspondente como contexto.*
