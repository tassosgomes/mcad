---
status: pending
parallelizable: true
blocked_by: ["1.0", "2.0", "5.0"]
---

<task_context>
<domain>frontend/auditoria</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>8.0</unblocks>
</task_context>

# Tarefa 6.0: Implementar UI React de catalogo, eventos e snapshot Ouro

## Relacionada as User Stories

- Gestor consulta catalogo Bronze/Prata/Ouro por nomes de negocio.
- Auditor filtra eventos sem depender de identificadores tecnicos.
- Responsavel por incidente visualiza snapshot Ouro com contexto de quem consultou e quando.

## Visao Geral

Evoluir a feature de Auditoria no frontend para consumir os endpoints do BFF, exibir catalogo consultavel, filtros de eventos e detalhe de snapshot Ouro somente para usuarios autorizados.

## Requisitos

- Usar `/api/auditoria/catalogo`, `/api/auditoria/eventos` e `/api/auditoria/eventos/:eventId` via BFF.
- Exibir nomes amigaveis, dominios, niveis, justificativas e aliases de forma secundaria.
- Filtrar eventos por usuario, tela, periodo, entidade/contexto e nivel quando disponivel.
- Exibir detalhe Prata/Ouro com rota, filtros, parametros e identificadores de negocio.
- Exibir snapshot Ouro somente quando o BFF retornar o conteudo autorizado.
- Mostrar estado 403 claro quando o usuario puder ver o evento, mas nao o snapshot.
- Evitar termos tecnicos como informacao primaria; `screenId` e payload interno devem ser secundarios.

## Arquivos Envolvidos

- **Modificar/Criar conforme estrutura atual:**
  - `frontend/src/features/auditoria/index.tsx`
  - `frontend/src/features/auditoria/pages/*`
  - `frontend/src/features/auditoria/api/*`
  - `frontend/src/features/auditoria/components/*`
  - `frontend/src/app/router/routes.tsx`
  - `frontend/src/shared/services/apiBffClient.ts`, se necessario
  - Testes em `frontend/src/features/auditoria/**/__tests__/*`
- **Referencia:**
  - `frontend/src/shared/auth/RequirePermission.tsx`
  - `frontend/src/shared/authz/usePermissions.ts`
  - `frontend/src/shared/components/ui/*`

## Subtarefas

- [ ] 6.1 Mapear a tela atual de Auditoria/Acessos e identificar chamadas diretas ao audit-service que devem passar pelo BFF.
- [ ] 6.2 Criar cliente tipado para catalogo, eventos e detalhe.
- [ ] 6.3 Implementar aba/visao de Catalogo com filtros por dominio, nivel e texto.
- [ ] 6.4 Implementar filtros de Eventos por usuario, tela, periodo, entidade/contexto e nivel.
- [ ] 6.5 Implementar detalhe de evento com nome amigavel, rota, filtros, contexto de negocio e correlacao.
- [ ] 6.6 Implementar visualizacao de snapshot Ouro com aviso de contexto: usuario original e data/hora da consulta.
- [ ] 6.7 Implementar estados de permissao: sem acesso a Auditoria, sem acesso a snapshot, vazio, erro e carregando.
- [ ] 6.8 Adicionar testes RTL para permissao, filtros, catalogo, detalhe Prata e detalhe Ouro sem/with snapshot.
- [ ] 6.9 Atualizar rotas e navegacao sem criar landing page de marketing.

## Sequenciamento

- Bloqueado por: 1.0, 2.0, 5.0
- Desbloqueia: 8.0
- Paralelizavel: Sim. Pode ser desenvolvido com mocks dos endpoints BFF apos os contratos de 5.0.

## Rastreabilidade

- Cobre RF-01, RF-04, RF-05 e RF-06.
- Evidencia esperada: usuario autorizado consulta catalogo/eventos e abre snapshot; usuario sem permissao forte nao ve snapshot.

## Detalhes de Implementacao

Manter a UI operacional e densa, alinhada ao restante do MCAD. O foco da tela e investigacao: filtros, tabela, detalhe e leitura clara do contexto. Evitar expor payload bruto como primeira informacao; o snapshot pode ser apresentado de forma estruturada quando possivel e com fallback JSON formatado quando necessario.

## Criterios de Sucesso Verificaveis

- [ ] Catalogo exibe nome amigavel, dominio, nivel e justificativa.
- [ ] Eventos podem ser filtrados por usuario, tela e periodo.
- [ ] Detalhe de evento Prata/Ouro mostra rota, parametros/filtros e contexto de negocio.
- [ ] Snapshot Ouro aparece apenas quando autorizado pelo BFF.
- [ ] Usuario sem `snapshot:visualizar` recebe bloqueio claro e nenhum dado sensivel no DOM.
- [ ] Testes de frontend passam.
