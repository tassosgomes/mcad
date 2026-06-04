---
status: pending
parallelizable: false
blocked_by: []
---

<task_context>
<domain>plataforma/auditoria/catalogo</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>2.0, 3.0, 5.0, 6.0, 7.0</unblocks>
</task_context>

# Tarefa 1.0: Criar catalogo governado de telas e operacoes auditadas

## Relacionada as User Stories

- Gestor de negocio consulta a classificacao Bronze/Prata/Ouro.
- Product owner garante Bronze como default para telas sem classificacao explicita.
- Auditor e Compliance usam nomes amigaveis e justificativas para entender o rastro gerado.

## Visao Geral

Criar o catalogo versionado em codigo que classifica telas e operacoes como `BRONZE`, `SILVER` ou `GOLD`. O catalogo deve ser a fonte autoritativa do BFF para captura de leituras e tambem alimentar a exibicao no frontend, sem parametrizacao livre em runtime.

## Requisitos

- Criar catalogo com `id`, `aliases`, `domain`, `friendlyName`, `routePatterns`, `methods`, `level`, `justification`, `owner`, `approvedBy`, `approvedAt`, `changeReason`, `businessContext` e `retentionDays`.
- Garantir que ausencia de classificacao explicita equivale a `BRONZE`.
- Marcar como `GOLD` as telas iniciais obrigatorias: `cadastro.titulares.lista`, `arrecadacao.pagamentos.lista` e `arrecadacao.verbas.lista`.
- Incluir aliases legados como `CADASTRO_TITULARES`, `ARRECADACAO_PAGAMENTOS` e `ARRECADACAO_VERBAS`.
- Definir extratores de contexto para filtros, paginacao, ordenacao, entidade/codigo de negocio e rota.
- Impedir que hint do frontend reduza criticidade ou aponte para tela incompativel com a rota real.
- Documentar que alteracoes no catalogo acontecem via PR/deploy, com rastreabilidade por Git.

## Arquivos Envolvidos

- **Criar:**
  - `services/bff/src/auditoria/screenAuditCatalog.ts`
  - `services/bff/src/auditoria/screenAuditCatalog.test.ts`
  - `services/bff/src/auditoria/screenAuditClassifier.ts`
  - `services/bff/src/auditoria/screenAuditClassifier.test.ts`
  - Artefato compartilhado ou gerado para o frontend, se o projeto ainda nao tiver mecanismo equivalente
- **Modificar:**
  - `services/bff/src/server.ts` ou registro equivalente, se necessario para expor metadados internos
  - `frontend/src/features/auditoria/*`, somente para preparar consumo de tipos compartilhados se nao houver task 6.0 separada suficiente
- **Referencia:**
  - `tasks/plataforma/prd-auditoria-telas/prd.md`
  - `tasks/plataforma/prd-auditoria-telas/techspec.md`
  - `services/bff/src/proxy.ts`
  - `frontend/src/app/router/routes.tsx`

## Subtarefas

- [ ] 1.1 Definir tipos `AuditLevel`, `AuditScreenOperation` e `BusinessContextRule`.
- [ ] 1.2 Criar lista inicial do catalogo com dominios Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria.
- [ ] 1.3 Classificar como `GOLD` as tres telas obrigatorias do PRD, com justificativa, responsavel e retencao de 90 dias.
- [ ] 1.4 Definir entradas `SILVER` iniciais para telas com dados pessoais, terceiros ou financeiros, conforme lista oficial disponivel; se a lista ainda nao existir, deixar marcador explicito para produto/compliance sem bloquear as tres Ouro.
- [ ] 1.5 Implementar resolucao por rota/metodo e aliases, retornando Bronze quando nao houver match.
- [ ] 1.6 Implementar validacao de hint `X-Audit-Screen-Id` contra allowlist por rota/metodo.
- [ ] 1.7 Implementar extratores de contexto para query params, paginacao, limite, ordenacao e identificadores de negocio.
- [ ] 1.8 Adicionar testes de consistencia: Bronze default, aliases, Ouro inicial, `retentionDays=90`, rotas sem duplicidade e hint incapaz de reduzir criticidade.
- [ ] 1.9 Documentar no proprio arquivo ou README curto o fluxo de alteracao via PR/deploy.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 5.0, 6.0, 7.0
- Paralelizavel: Nao. Esta tarefa define o contrato compartilhado e a regra de criticidade usada pelas demais.

## Rastreabilidade

- Cobre RF-01, RF-06, RF-07 e RF-08.
- Evidencia esperada: testes comprovam Bronze default, aliases e classificacao Ouro inicial.

## Detalhes de Implementacao

O `id` canonico deve usar dot-notation, por exemplo `cadastro.titulares.lista`. Os aliases preservam correlacao com eventos existentes e producers legados. O BFF deve sempre confiar na rota real e no catalogo, nunca em valor livre enviado pelo navegador.

Snapshot so se aplica a `GOLD`. `SILVER` registra metadados e contexto de negocio sem corpo de resposta. `BRONZE` em `GET` nao gera `SCREEN_ACCESS` por default.

## Criterios de Sucesso Verificaveis

- [ ] `GET` sem entrada explicita no catalogo resolve como Bronze.
- [ ] As tres telas obrigatorias existem como `GOLD` e aceitam aliases legados.
- [ ] Entradas `SILVER`/`GOLD` possuem justificativa, responsavel e `retentionDays=90`.
- [ ] Nao ha duas operacoes concorrentes para a mesma combinacao rota/metodo sem regra de desempate.
- [ ] Hint de tela divergente da rota real e rejeitado ou ignorado sem reduzir criticidade.
- [ ] Testes unitarios do catalogo e classificador passam.
