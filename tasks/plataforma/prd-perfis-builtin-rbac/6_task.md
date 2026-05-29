---
status: completed
parallelizable: true
blocked_by: [4.0]
---

<task_context>
<domain>engine/frontend/autorizacao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>react,vite,tanstack-query,bff</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 6.0: Implementar telas de Acessos no frontend (`AtribuicoesPage`, `MeuDominioPage`)

## Relacionada às User Stories

- [US-04] Gestor de Acessos (atribuir/remover papéis) — cobertura direta
- [US-05] Auditor / Compliance Officer (Consultor de Acessos read-only) — cobertura direta
- [US-03] Gerente de Distribuição (visão escopada) — cobertura direta

## Visão Geral

Criar duas páginas novas dentro de `/autorizacao/*`:

1. **`/autorizacao/atribuicoes`** — Gestor de Acessos: lista usuários, atribui/remove papéis.
2. **`/autorizacao/meu-dominio`** — Gerente: vê assignments do(s) domínio(s) que gerencia (consumindo a mesma rota BFF, que filtra server-side).

Ambas consomem `/api/acessos/*` da Tarefa 4.0. A diferença é o conjunto de permissões verificadas no gating de cada elemento (botões de atribuir/remover só aparecem quando `acessos:default:papel:atribuir`).

## Requisitos

- 2 páginas novas + 2 arquivos de teste RTL.
- Atualização de `routes.tsx` para registrar as novas rotas com gating.
- Atualização de `Sidebar.tsx` para abrir o módulo "Autorização" para os 3 perfis (super-admin, Gestor de Acessos, Gerente de qualquer domínio).
- Reuso de componentes da admin UI existente em `/autorizacao/papeis` quando aplicável (a auditar).
- Cada elemento de ação gateado por `<Can permission="...">`.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/autorizacao/atribuicoes/AtribuicoesPage.tsx`
  - `frontend/src/features/autorizacao/atribuicoes/AtribuicoesPage.test.tsx`
  - `frontend/src/features/autorizacao/meu-dominio/MeuDominioPage.tsx`
  - `frontend/src/features/autorizacao/meu-dominio/MeuDominioPage.test.tsx`
  - `frontend/src/features/autorizacao/api/acessosApi.ts` (cliente Tanstack Query para `/api/acessos/*`)
- **Modificar:**
  - `frontend/src/app/router/routes.tsx` (registrar `/autorizacao/atribuicoes` e `/autorizacao/meu-dominio` com `<RequirePermission>`)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (sub-itens do módulo "Autorização")
- **Referência:**
  - `frontend/src/shared/auth/RequirePermission.tsx` (gating de rota)
  - `frontend/src/shared/authz/Can.tsx` (gating de componente)
  - `frontend/src/shared/authz/usePermissions.ts`
  - `frontend/src/features/autorizacao/papeis/` (admin UI existente — usar como modelo visual)
  - `docs/adr/0008-bff-gateway-cross-cutting.md` (contrato do BFF)
- **Skills para consultar:**
  - `react-architecture` — estrutura `features/*`
  - `react-testing` — Vitest + RTL + `userEvent`; mock de `usePermissions` para cada cenário
  - `react-code-quality` — TS estrito, hooks patterns

## Subtarefas

- [ ] 6.1 Criar `acessosApi.ts` com hooks Tanstack Query: `useAssignments(query)`, `usePapeis()`, `useAtribuirPapel()`, `useRemoverPapel()`
- [ ] 6.2 Criar `AtribuicoesPage.tsx` — listagem + formulário de atribuição (auto-complete de usuário + select de papel) + botão "Atribuir" gateado por `<Can permission="acessos:default:papel:atribuir">`
- [ ] 6.3 Criar `MeuDominioPage.tsx` — listagem read-only (sem botões de escrita); usa o mesmo endpoint, BFF aplica escopo
- [ ] 6.4 Atualizar `routes.tsx`:
  - `/autorizacao/atribuicoes` envolto em `<RequirePermission permissions={['acessos:default:papel:listar']}>`
  - `/autorizacao/meu-dominio` envolto em `<RequirePermission permissions={['acessos:default:papel:listar', 'acessos:cadastro:papel:visualizar', 'acessos:identificacao:papel:visualizar', 'acessos:arrecadacao:papel:visualizar', 'acessos:distribuicao:papel:visualizar']} requireAny />` (ou semântica equivalente — qualquer das listadas)
- [ ] 6.5 Atualizar `Sidebar.tsx` — sub-itens do menu Autorização:
  - "Papéis" — visível para super-admin (`authz:admin:*` — manter)
  - "Atribuir Acessos" — visível para Gestor (`acessos:default:papel:atribuir`)
  - "Meu Domínio" — visível para Gerentes (`acessos:*:papel:visualizar` ou `acessos:default:papel:listar`)
- [ ] 6.6 Testes RTL `AtribuicoesPage.test.tsx`:
  - Gestor vê form de atribuição e botões; clica "Atribuir" e dispara mutation
  - Consultor de Acessos NÃO vê form, mas vê lista
  - Sem permissão (caso errado de rota) renderiza estado vazio ou redirect (deferir a `RequirePermission`)
- [ ] 6.7 Testes RTL `MeuDominioPage.test.tsx`:
  - Render quando perm escopada presente; lista mostra somente roles do domínio (mock BFF retorna já filtrado)
  - Sem perm → não acessa (gating de rota)

## Sequenciamento

- Bloqueado por: 4.0 (precisa das rotas BFF de Acessos funcionando)
- Desbloqueia: 8.0 (docs/e2e)
- Paralelizável: Sim — em paralelo a 7.0 (telas independentes)

## Rastreabilidade

- Esta tarefa cobre: RF-04 (Gestor + Consultor de Acessos), RF-05 (visualização escopada — UI consumindo)
- Evidência esperada: 2 telas funcionais + testes RTL + manual com `gestor-acessos.dev` atribuindo papel a outro usuário com sucesso

## Detalhes de Implementação

### `acessosApi.ts` (esqueleto)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authedFetch } from '@shared/api/authedFetch';

interface Assignment {
  subject: string;
  email?: string;
  name?: string;
  roles: Array<{ key: string; domain: string; displayName: string }>;
}

interface AssignmentsPage {
  items: Assignment[];
  page: number; size: number; total: number;
}

export function useAssignments(params: { page?: number; size?: number; query?: string }) {
  return useQuery({
    queryKey: ['acessos', 'assignments', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return authedFetch<AssignmentsPage>(`/api/acessos/assignments?${qs}`);
    }
  });
}

export function useAtribuirPapel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roleKey: string }) =>
      authedFetch(`/api/acessos/papeis/atribuir`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['acessos', 'assignments'] })
  });
}
```

### `AtribuicoesPage.tsx` — estrutura

```tsx
export function AtribuicoesPage() {
  const { data, isLoading } = useAssignments({ size: 50 });
  const atribuir = useAtribuirPapel();

  return (
    <div>
      <PageHeader title="Atribuir Acessos" />

      <Can permission="acessos:default:papel:atribuir">
        <Card>
          <h2>Nova Atribuição</h2>
          <UserAutocomplete onSelect={setUserId} />
          <RoleSelect onSelect={setRoleKey} />
          <Button onClick={() => atribuir.mutate({ userId, roleKey })}>Atribuir</Button>
        </Card>
      </Can>

      <Card>
        <h2>Atribuições Existentes</h2>
        <AssignmentsTable
          items={data?.items ?? []}
          isLoading={isLoading}
          renderRoleActions={(assignment, role) => (
            <Can permission="acessos:default:papel:remover">
              <Button variant="ghost" onClick={() => remover.mutate({ ... })}>Remover</Button>
            </Can>
          )}
        />
      </Card>
    </div>
  );
}
```

### `MeuDominioPage.tsx` — estrutura

```tsx
export function MeuDominioPage() {
  const { data, isLoading } = useAssignments({ size: 100 });
  // BFF já filtra por domínio do caller; UI apenas renderiza
  return (
    <div>
      <PageHeader
        title="Acessos do meu domínio"
        description="Você vê apenas usuários e papéis dos domínios que gerencia."
      />
      <AssignmentsTable items={data?.items ?? []} isLoading={isLoading} readOnly />
    </div>
  );
}
```

### `routes.tsx` — trechos a adicionar

```tsx
{
  path: '/autorizacao',
  element: <ProtectedRoute><AutorizacaoLayout /></ProtectedRoute>,
  children: [
    { path: 'papeis', element: <PapeisPage /> }, // existente
    {
      path: 'atribuicoes',
      element: (
        <RequirePermission permissions={['acessos:default:papel:listar']}>
          <AtribuicoesPage />
        </RequirePermission>
      )
    },
    {
      path: 'meu-dominio',
      element: (
        <RequirePermission
          requireAny
          permissions={[
            'acessos:default:papel:listar',
            'acessos:cadastro:papel:visualizar',
            'acessos:identificacao:papel:visualizar',
            'acessos:arrecadacao:papel:visualizar',
            'acessos:distribuicao:papel:visualizar'
          ]}
        >
          <MeuDominioPage />
        </RequirePermission>
      )
    }
  ]
}
```

> **Atenção:** se `RequirePermission` não suportar `requireAny`, ou faz parte desta tarefa estender o componente, ou registrar a alternativa em "Questões" da própria task. Verificar implementação atual em `frontend/src/shared/auth/RequirePermission.tsx`.

### Sidebar.tsx — gating sugerido

```tsx
{
  label: 'Autorização',
  icon: ShieldIcon,
  visibleWhen: hasAny([
    'authz:admin:*',
    'acessos:default:papel:listar',
    'acessos:cadastro:papel:visualizar',
    'acessos:identificacao:papel:visualizar',
    'acessos:arrecadacao:papel:visualizar',
    'acessos:distribuicao:papel:visualizar'
  ]),
  children: [
    { label: 'Papéis', to: '/autorizacao/papeis', visibleWhen: has('authz:admin:*') },
    { label: 'Atribuir Acessos', to: '/autorizacao/atribuicoes', visibleWhen: has('acessos:default:papel:listar') },
    { label: 'Meu Domínio', to: '/autorizacao/meu-dominio', visibleWhen: hasAny(['acessos:cadastro:papel:visualizar', 'acessos:identificacao:papel:visualizar', 'acessos:arrecadacao:papel:visualizar', 'acessos:distribuicao:papel:visualizar']) }
  ]
}
```

### Testes (RTL) — esqueleto

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtribuicoesPage } from './AtribuicoesPage';

describe('AtribuicoesPage', () => {
  it('renders_assignmentForm_whenGestorAcessos', async () => {
    mockUsePermissions(['acessos:default:papel:listar', 'acessos:default:papel:atribuir']);
    mockApi('/api/acessos/assignments', { items: [], page: 1, size: 50, total: 0 });

    render(<AtribuicoesPage />);

    expect(await screen.findByRole('button', { name: /atribuir/i })).toBeInTheDocument();
  });

  it('hidesAssignmentForm_whenConsultorAcessos', async () => {
    mockUsePermissions(['acessos:default:papel:listar']);
    mockApi('/api/acessos/assignments', { items: [], page: 1, size: 50, total: 0 });

    render(<AtribuicoesPage />);

    await waitFor(() => expect(screen.queryByRole('button', { name: /atribuir/i })).not.toBeInTheDocument());
  });
});
```

**Convenções da stack (das skills consultadas):**

- Vitest + RTL + `userEvent` (`react-testing`)
- Queries semânticas (`getByRole`, `getByLabelText`)
- AAA implícito (RTL incentiva)
- Mock do `usePermissions` é a forma canônica de simular perfis no frontend (`shared/authz/__tests__/` deve ter helper)
- Mock de fetch via MSW se já existir no projeto; senão `vi.fn()` direto

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd frontend && npm run build` sem erros TS
- [ ] Lint: `cd frontend && npm run lint` sem warnings
- [ ] Testes: `cd frontend && npm test -- AtribuicoesPage MeuDominioPage acessosApi` verdes
- [ ] Cobertura de testes ≥ 70% nas 2 páginas novas
- [ ] Manual com BFF + DEV seedado:
  - `gestor-acessos.dev` consegue acessar `/autorizacao/atribuicoes`, atribuir um papel novo e ver na lista
  - `gerente.dev` consegue acessar `/autorizacao/meu-dominio` e ver apenas assignments de Distribuição
  - `consultor.dev` (Consultor de Distribuição) é redirecionado ao tentar acessar essas rotas
- [ ] Sidebar mostra/oculta corretamente cada sub-item conforme o perfil logado
