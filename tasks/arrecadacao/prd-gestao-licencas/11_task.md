---
status: done
parallelizable: false
blocked_by: ["10.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 11.0: Routing e Sidebar

## Relacionada as User Stories
- [HU-01] Criar licenca (suporte — rota /arrecadacao/licencas/nova protegida por role)
- [HU-02] Listar licencas com filtros (suporte — rota /arrecadacao/licencas)
- [HU-03] Visualizar detalhe de licenca (suporte — rota /arrecadacao/licencas/:id)
- [HU-04] Suspender licenca (suporte — navegacao via sidebar e rotas)
- [HU-05] Reativar licenca (suporte — navegacao via sidebar e rotas)
- [HU-06] Encerrar licenca (suporte — navegacao via sidebar e rotas)

## Visao Geral

Integra o modulo de Licencas no sistema de navegacao da aplicacao: adiciona as 3 rotas protegidas por role em `routes.tsx` com lazy loading e ativa a secao "Arrecadacao" no sidebar com o sub-item "Licencas". Esta e a ultima tarefa do modulo e torna as paginas acessiveis na aplicacao.

## Requisitos

- Adicionar rota `/arrecadacao/licencas` protegida por `['analista-arrecadacao', 'consultor-arrecadacao']` com `LicencasPage` (lazy)
- Adicionar rota `/arrecadacao/licencas/nova` protegida por `['analista-arrecadacao']` com `LicencaCreatePage` (lazy)
- Adicionar rota `/arrecadacao/licencas/:id` protegida por `['analista-arrecadacao', 'consultor-arrecadacao']` com `LicencaDetailPage` (lazy)
- Usar `React.lazy` + `Suspense` para todas as paginas (padrao do projeto)
- Usar `RequireRole` (ou equivalente do projeto) para protecao por role
- Ativar a secao "Arrecadacao" no sidebar: alterar `disabled: true` para `disabled: false`
- Adicionar sub-item "Licencas" com `path: '/arrecadacao/licencas'` dentro da secao Arrecadacao
- Manter `requiredRoles: ['analista-arrecadacao', 'consultor-arrecadacao']` na secao Arrecadacao

## Arquivos Envolvidos

- **Criar:** Nenhum
- **Modificar:**
  - `frontend/src/app/router/routes.tsx` — adicionar rotas /arrecadacao/licencas/* com lazy loading e RequireRole
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` — ativar secao Arrecadacao (disabled: false) e adicionar sub-item "Licencas"
- **Referencia:**
  - `frontend/src/app/router/routes.tsx` (estado atual) — padrao de rotas existentes (identificacao/*)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (estado atual) — estrutura de secoes e sub-itens
  - `frontend/src/features/arrecadacao/licencas/pages/LicencasPage.tsx` — importacao lazy
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaCreatePage.tsx` — importacao lazy
  - `frontend/src/features/arrecadacao/licencas/pages/LicencaDetailPage.tsx` — importacao lazy

## Subtarefas

- [x] 11.1 Adicionar imports lazy das 3 paginas em `routes.tsx`
- [x] 11.2 Adicionar bloco de rotas `arrecadacao` com os 3 paths e protecao por role em `routes.tsx`
- [x] 11.3 Ativar secao Arrecadacao no `Sidebar.tsx` (disabled: false)
- [x] 11.4 Adicionar sub-item "Licencas" na secao Arrecadacao do `Sidebar.tsx`

## Sequenciamento

- Bloqueado por: 10.0
- Desbloqueia: Nenhum (ultima tarefa do modulo)
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: navegacao protegida por role, ativacao da secao Arrecadacao no sidebar
- Evidencia esperada: sidebar exibe secao Arrecadacao com sub-item Licencas para usuarios com role correto; navegacao direta por URL funciona; rota /nova retorna erro de acesso para consultor

## Detalhes de Implementacao

**routes.tsx — bloco a adicionar:**

```typescript
// Lazy imports (adicionar junto aos outros imports lazy)
const LicencasPage = React.lazy(() =>
  import('@/features/arrecadacao/licencas/pages/LicencasPage')
);
const LicencaCreatePage = React.lazy(() =>
  import('@/features/arrecadacao/licencas/pages/LicencaCreatePage')
);
const LicencaDetailPage = React.lazy(() =>
  import('@/features/arrecadacao/licencas/pages/LicencaDetailPage')
);

// Rotas (dentro do layout protegido, junto aos outros dominios):
{
  path: 'arrecadacao',
  children: [
    {
      path: 'licencas',
      element: (
        <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}>
          <LicencasPage />
        </RequireRole>
      ),
    },
    {
      path: 'licencas/nova',
      element: (
        <RequireRole roles={['analista-arrecadacao']}>
          <LicencaCreatePage />
        </RequireRole>
      ),
    },
    {
      path: 'licencas/:id',
      element: (
        <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}>
          <LicencaDetailPage />
        </RequireRole>
      ),
    },
  ],
}
```

**Sidebar.tsx — alteracoes:**

```typescript
// Localizar o objeto da secao Arrecadacao (provavelmente com icon: Banknote)
// Alterar: disabled: true  →  disabled: false
// Adicionar sub-item na lista children:
{
  label: 'Arrecadacao',
  icon: Banknote,
  basePath: '/arrecadacao',
  requiredRoles: ['analista-arrecadacao', 'consultor-arrecadacao'],
  disabled: false,  // ← era true
  children: [
    { label: 'Licencas', path: '/arrecadacao/licencas' },
  ],
}
```

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
