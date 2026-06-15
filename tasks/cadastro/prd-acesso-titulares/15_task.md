---
status: pending
parallelizable: true
blocked_by: ["13.0", "11.0", "12.0"]
---

<task_context>
<domain>frontend/cadastro</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"16.0"</unblocks>
</task_context>

# Tarefa 15.0: Frontend — Páginas do Analista (Triagem de Ocorrências, Aprovação de Solicitações)

## Visão Geral

Adicionar à área interna existente (fluxo OIDC) as telas de Analista para triagem de ocorrências e aprovação/rejeição de solicitações de alteração. Estas páginas usam o `apiClient` OIDC existente e são protegidas por `RequirePermission` no frontend (alinhado com as permissões do backend).

## Requisitos

- HU-08 (triar e resolver ocorrências), HU-09 (aprovar/rejeitar alterações sensíveis)
- RF-33 a RF-39 (ocorrências), RF-16/RF-18/RF-19 (solicitações)
- PRD — seção *Permissionamento* e ADR 0004 (frontend esconde ações conforme permissões)

## Subtarefas

- [ ] 15.1 Criar `features/cadastro/ocorrencias/` — feature para o painel do analista:
  - `pages/OcorrenciasPage.tsx` — tabela de todas as ocorrências (todos os titulares) com filtros por status, titular e tipo (RF-33). Badges de status. Botões de ação condicionais por permissão (`RequirePermission`).
  - `pages/OcorrenciaDetailPage.tsx` (ou modal) — detalhe da ocorrência com ações: "Assumir Análise" (`ABERTA → EM_ANALISE`), "Resolver" (com campo de parecer), "Cancelar" (com justificativa).
  - `api/ocorrenciasApi.ts` — usa `apiClient` OIDC (base URL `/api/v1/ocorrencias`).
  - `hooks/useOcorrencias.ts`, `useAnalisarOcorrencia.ts`, `useResolverOcorrencia.ts`, `useCancelarOcorrencia.ts`.
  - `types/ocorrencia.ts`.
- [ ] 15.2 Criar `features/cadastro/solicitacoes/` — feature para o painel do analista:
  - `pages/SolicitacoesPage.tsx` — tabela de solicitações com status (`SOLICITADA`/`APROVADA`/`REJEITADA`), campo, valor atual vs. pretendido, justificativa do titular.
  - Ações: "Aprovar" e "Rejeitar" (com campo de justificativa de rejeição). Confirmar aprovação mostrando o diff (valor atual → valor pretendido) antes de aplicar.
  - `api/solicitacoesApi.ts`, `hooks/useSolicitacoes.ts`, `types/solicitacao.ts`.
- [ ] 15.3 Adicionar entradas na `Sidebar.tsx` (grupo Cadastro) com `requiredPermissions`:
  - "Ocorrências" → `anyOf: [OcorrenciaListar]`
  - "Solicitações de Alteração" → `anyOf: [SolicitacaoAlteracaoListar]`
- [ ] 15.4 Adicionar rotas em `features/cadastro/index.tsx` (ou arquivo de rotas apropriado), cada uma envolvida em `<RequirePermission permission="cadastro:default:ocorrencia:listar">` etc.
- [ ] 15.5 Garantir que ações de escrita (analisar/resolver/cancelar/aprovar/rejeitar) só aparecem se o usuário tiver a permissão específica (`usePermissions().has(...)`).
- [ ] 15.6 Testes (Vitest + RTL): render condicional por permissão, fluxos de aprovação/rejeição mockados.

## Sequenciamento

- Bloqueado por: 13.0 (infra frontend — embora use o fluxo OIDC, precisa da infra de rotas), 11.0, 12.0 (endpoints de analista)
- Desbloqueia: 16.0 (testes E2E)
- Paralelizável: Sim (paralelo a 14.0 — páginas do titular; usa apiClient OIDC diferente)

## Detalhes de Implementação

**Permissões no frontend:** o `usePermissions()` (de `@shared/authz`) verifica as permissões recebidas do BFF/authz-service. Envolver rotas e botões em `<RequirePermission>`. Exemplo:

```tsx
<RequirePermission permission={CadastroPermissions.OcorrenciaResolver}>
  <Button onClick={handleResolver}>Resolver</Button>
</RequirePermission>
```

> A proteção real é no backend — o frontend apenas esconde a UI (ADR 0004).

**Confirmação de aprovação:** antes de aprovar uma solicitação de alteração sensível, exibir um modal de confirmação mostrando o diff (ex: "Nome: 'João' → 'João Silva'") para o Analista confirmar. Reduz erros.

**Estrutura de feature:** seguir o padrão `features/cadastro/{aggregate}/` exatamente como `titulares/`, `obras/`, etc. Estas são features da área interna (OIDC), não do portal.

## Critérios de Sucesso

- Analista vê todas as ocorrências com filtros e pode progredir o estado (HU-08).
- Analista aprova/rejeita solicitações com confirmação de diff (HU-09).
- Botões de ação aparecem apenas para quem tem permissão.
- Entradas na Sidebar condicionadas por permissão.
- `npm run build` e `npm run lint` passam.
