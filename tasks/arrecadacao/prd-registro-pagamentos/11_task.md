---
status: done
parallelizable: false
blocked_by: ["10.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 11.0: Frontend — routing e sidebar

## Relacionada as User Stories

- [HU-01] a [HU-06] (suporte — navegacao para todas as funcionalidades)

## Visao Geral

Integrar os dois novos modulos (UDA e Pagamentos) no sistema de rotas e no sidebar. Adicionar 4 rotas com lazy loading e RequireRole, e 2 sub-itens na secao Arrecadacao do sidebar.

## Requisitos

- 4 rotas: /arrecadacao/uda (ambos), /arrecadacao/pagamentos (ambos), /arrecadacao/pagamentos/novo (analista), /arrecadacao/pagamentos/:id (ambos)
- Lazy loading para todas as pages
- RequireRole com roles corretas (analista-arrecadacao + consultor-arrecadacao para leitura, apenas analista para criacao)
- Sidebar: adicionar "Pagamentos" e "UDA" na secao Arrecadacao (ja ativada no F03)

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/app/router/routes.tsx` (adicionar 4 rotas)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (adicionar 2 sub-itens)
- **Referencia:**
  - `frontend/src/features/arrecadacao/uda/pages/UdaPage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentosPage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoCreatePage.tsx`
  - `frontend/src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx`
- **Skills para consultar durante implementacao:**
  - `react-architecture` — routing, lazy loading

## Subtarefas

- [x] 11.1 Adicionar 4 rotas em `routes.tsx` com lazy loading e RequireRole
- [x] 11.2 Adicionar sub-itens "Pagamentos" e "UDA" no sidebar

## Sequenciamento

- Bloqueado por: 10.0
- Desbloqueia: Nenhum (tarefa final do F04)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: seguranca (RequireRole) + navegacao
- Evidencia esperada: rotas acessiveis, sidebar exibe links, permissoes aplicadas

## Detalhes de Implementacao

**routes.tsx (adicionar dentro de /arrecadacao):**

```typescript
{
  path: 'uda',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><UdaPage /></RequireRole>
},
{
  path: 'pagamentos',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><PagamentosPage /></RequireRole>
},
{
  path: 'pagamentos/novo',
  element: <RequireRole roles={['analista-arrecadacao']}><PagamentoCreatePage /></RequireRole>
},
{
  path: 'pagamentos/:id',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><PagamentoDetailPage /></RequireRole>
},
```

**Nota:** `pagamentos/novo` deve vir ANTES de `pagamentos/:id` para evitar match errado.

**Sidebar (adicionar sub-itens na secao Arrecadacao):**

```typescript
children: [
  { label: 'Licencas', path: '/arrecadacao/licencas' },      // F03
  { label: 'Pagamentos', path: '/arrecadacao/pagamentos' },   // F04
  { label: 'UDA', path: '/arrecadacao/uda' },                 // F04
]
```

**Convencoes da stack:**
- Lazy loading: `React.lazy(() => import(...))`
- RequireRole para controle de acesso por rota
- Ordem de rotas: mais especificas primeiro (/novo antes de /:id)

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [x] Rota /arrecadacao/uda carrega UdaPage
- [x] Rota /arrecadacao/pagamentos carrega PagamentosPage
- [x] Rota /arrecadacao/pagamentos/novo carrega PagamentoCreatePage (apenas analista)
- [x] Rota /arrecadacao/pagamentos/:id carrega PagamentoDetailPage
- [x] Sidebar exibe "Pagamentos" e "UDA" na secao Arrecadacao
