---
status: pending
parallelizable: true
blocked_by: ["2.0", "3.0"]
---

<task_context>
<domain>plataforma/bff/auditoria-consulta</domain>
<type>integration</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>6.0, 8.0</unblocks>
</task_context>

# Tarefa 5.0: Expor endpoints BFF de catalogo, eventos e detalhe de auditoria

## Relacionada as User Stories

- Gestor consulta classificacao de telas.
- Auditor filtra eventos por usuario, tela, periodo, entidade/contexto e nivel.
- Responsavel por incidente abre detalhe Ouro com snapshot quando autorizado.

## Visao Geral

Evoluir as rotas BFF de Auditoria para servir o catalogo governado e criar wrappers amigaveis para eventos e detalhes do `ecad-auditoria`, aplicando permissoes oficiais e escondendo payloads sensiveis quando o usuario nao tiver autorizacao.

## Requisitos

- Implementar `GET /api/auditoria/catalogo` com nomes amigaveis, dominio, nivel, justificativa e aliases.
- Implementar `GET /api/auditoria/eventos` com filtros por usuario, tela, periodo, entidade/contexto e nivel quando suportado pelo payload.
- Implementar `GET /api/auditoria/eventos/:eventId` com detalhe do evento.
- Exigir `auditoria:default:catalogo:visualizar` para catalogo.
- Exigir `auditoria:default:evento:listar` para listagem e detalhe.
- Exigir tambem `auditoria:default:snapshot:visualizar` quando o detalhe contiver snapshot Ouro.
- Manter compatibilidade com `GET /api/auditoria/v1/audit/screen-access` quando ainda usado.

## Arquivos Envolvidos

- **Modificar:**
  - `services/bff/src/auditoriaRoutes.ts`
  - `services/bff/src/auditoriaRoutes.test.ts`
  - `services/bff/src/server.ts`, se houver registro de rota
- **Criar:**
  - `services/bff/src/auditoria/auditQueryClient.ts`
  - `services/bff/src/auditoria/auditQueryClient.test.ts`
  - `services/bff/src/auditoria/auditEventPresenter.ts`
  - `services/bff/src/auditoria/auditEventPresenter.test.ts`
- **Referencia:**
  - `services/bff/src/historicoRoutes.ts`
  - `services/bff/src/authzContext.ts`
  - `services/bff/src/auditoria/screenAuditCatalog.ts`

## Subtarefas

- [ ] 5.1 Revisar os endpoints atuais do `ecad-auditoria` acessados pelo BFF.
- [ ] 5.2 Criar presenter para transformar `screenId`, aliases e payload tecnico em nomes amigaveis e contexto de negocio.
- [ ] 5.3 Criar rota `GET /api/auditoria/catalogo` filtrada por permissoes.
- [ ] 5.4 Criar rota `GET /api/auditoria/eventos` com validacao de query params e repasse seguro ao audit-service.
- [ ] 5.5 Criar rota `GET /api/auditoria/eventos/:eventId` com enforcement extra para snapshot.
- [ ] 5.6 Garantir que usuarios sem snapshot recebam detalhe sem corpo sensivel ou 403, conforme decisao de UX da task 6.0.
- [ ] 5.7 Adicionar tratamento de timeout, upstream malformed payload e erros em formato consistente.
- [ ] 5.8 Adicionar testes para filtros, permissao, presentacao amigavel, snapshot autorizado e snapshot negado.

## Sequenciamento

- Bloqueado por: 2.0, 3.0
- Desbloqueia: 6.0, 8.0
- Paralelizavel: Sim. Pode iniciar antes da task 4.0 finalizar, desde que use eventos fake do shape definido em 3.0.

## Rastreabilidade

- Cobre RF-01, RF-04, RF-05 e RF-06.
- Evidencia esperada: endpoints BFF retornam catalogo/eventos com permissoes corretas e sem expor snapshot indevido.

## Detalhes de Implementacao

Como a Tech Spec deixa filtro dedicado por `auditLevel` no `ecad-auditoria` para evolucao futura, a V1 deve gravar e apresentar `auditLevel` no payload/metadata. Quando o audit-service nao filtrar nativamente por nivel, documentar a limitacao e evitar prometer filtro server-side inexistente.

## Criterios de Sucesso Verificaveis

- [ ] `GET /api/auditoria/catalogo` retorna apenas campos consultaveis e exige permissao.
- [ ] `GET /api/auditoria/eventos` valida filtros e propaga erros do audit-service com seguranca.
- [ ] `GET /api/auditoria/eventos/:eventId` retorna snapshot apenas para usuario autorizado.
- [ ] Evento com alias legado e apresentado com o nome amigavel canonico.
- [ ] Testes cobrem 401, 403, timeout, payload malformado e sucesso.
