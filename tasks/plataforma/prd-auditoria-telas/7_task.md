---
status: pending
parallelizable: true
blocked_by: ["1.0", "4.0"]
---

<task_context>
<domain>dominios/auditoria-cobertura</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server,database,external_apis</dependencies>
<unblocks>8.0</unblocks>
</task_context>

# Tarefa 7.0: Aplicar cobertura inicial por dominio e correlacao com alteracoes

## Relacionada as User Stories

- Auditor identifica usuarios com possivel acesso a dados vazados por dominio.
- Compliance ve alteracoes Bronze/Prata/Ouro correlacionadas ao acesso de tela.
- Produto entrega as telas Ouro iniciais obrigatorias.

## Visao Geral

Aplicar o catalogo inicial nas rotas reais dos dominios Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria, garantindo que as tres telas Ouro gerem snapshot e que comandos posteriores recebam headers de correlacao para manter `USER_ACTION`/`DATA_CHANGE` conectaveis ao acesso.

## Requisitos

- Cobrir as telas principais dos dominios citados pelo PRD.
- Garantir Ouro para Cadastro/Titulares, Arrecadacao/Pagamentos e Arrecadacao/Verbas.
- Garantir que telas de dados pessoais, terceiros ou financeiros tenham no minimo Prata salvo justificativa documentada.
- Validar que operacoes de alteracao continuam auditando `USER_ACTION`/`DATA_CHANGE`.
- Propagar `X-Audit-Screen-Access-Id` e demais headers para comandos de escrita quando houver contexto de tela.
- Criar smoke tests por dominio para leitura Prata/Ouro e escrita correlacionada.

## Arquivos Envolvidos

- **Modificar:**
  - `services/bff/src/auditoria/screenAuditCatalog.ts`
  - `services/bff/src/proxy.ts`, se ajustes de rota forem descobertos
  - APIs de dominio somente se faltarem captura/propagacao de headers de auditoria
  - Testes de BFF e dominio afetados
- **Referencia:**
  - `services/cadastro-api/**`
  - `services/arrecadacao-api/**/audit/**`
  - `services/distribuicao-api/**/audit/**`
  - `services/identificacao-api/**`
  - `services/bff/src/server.test.ts`

## Subtarefas

- [ ] 7.1 Inventariar rotas/telas principais de Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria.
- [ ] 7.2 Confirmar com o catalogo as tres telas Ouro obrigatorias e seus route patterns reais.
- [ ] 7.3 Classificar telas candidatas a Prata por dados pessoais, terceiros ou financeiros, registrando justificativas.
- [ ] 7.4 Adicionar aliases legados para eventos `DATA_CHANGE` ja existentes por dominio.
- [ ] 7.5 Validar que comandos de escrita recebem headers `X-Audit-*` e `traceparent` vindos do BFF.
- [ ] 7.6 Revisar handlers/outbox de dominios para garantir continuidade de `USER_ACTION` e `DATA_CHANGE`.
- [ ] 7.7 Criar smoke tests BFF para GET Ouro de Titulares, Pagamentos e Verbas.
- [ ] 7.8 Criar smoke tests de Prata para ao menos uma tela sensivel por dominio aplicavel.
- [ ] 7.9 Criar teste de escrita correlacionada comprovando `screenAccessId` propagado ate evento de alteracao ou contexto de audit outbox.
- [ ] 7.10 Registrar lacunas de cobertura como backlog explicito, sem mascarar ausencia de classificacao.

## Sequenciamento

- Bloqueado por: 1.0, 4.0
- Desbloqueia: 8.0
- Paralelizavel: Sim. Pode ser distribuida por dominio depois que o proxy auditado estiver pronto.

## Rastreabilidade

- Cobre RF-02, RF-07 e RF-08.
- Evidencia esperada: catalogo inicial cobre dominios principais e smoke tests comprovam Ouro nas tres telas obrigatorias.

## Detalhes de Implementacao

A primeira versao nao precisa implementar filtros por nivel no `ecad-auditoria` nem purge fisico de 90 dias. Ela deve gravar `retentionDays=90` e garantir que as rotas classificadas capturem corretamente. Telas sem decisao explicita continuam Bronze, mas as principais devem ter justificativa no catalogo.

## Criterios de Sucesso Verificaveis

- [ ] Catalogo cobre as principais telas dos cinco dominios do PRD.
- [ ] Titulares, Pagamentos e Verbas geram `SCREEN_ACCESS` Ouro com snapshot.
- [ ] Telas Prata geram `SCREEN_ACCESS` sem snapshot.
- [ ] Alteracoes em telas Bronze/Prata/Ouro continuam gerando auditoria de alteracao.
- [ ] Comandos posteriores recebem headers de correlacao.
- [ ] Lacunas de classificacao aparecem documentadas e rastreaveis.
