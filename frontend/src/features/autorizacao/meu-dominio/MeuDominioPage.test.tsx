import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequirePermission } from '@shared/auth/RequirePermission';
import { PermissionsContext, type PermissionsState } from '@shared/authz';
import { MeuDominioPage } from './MeuDominioPage';

const SCOPED_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:cadastro:papel:visualizar',
  'acessos:identificacao:papel:visualizar',
  'acessos:arrecadacao:papel:visualizar',
  'acessos:distribuicao:papel:visualizar',
];

function buildPermissionsState(permissions: string[]): PermissionsState {
  const set = new Set(permissions);
  return {
    permissions: set,
    version: 1,
    isLoading: false,
    error: null,
    can: (permission: string) => set.has(permission),
    hasAny: (perms: string[]) => perms.some((permission) => set.has(permission)),
    hasAll: (perms: string[]) => perms.every((permission) => set.has(permission)),
    reload: () => undefined,
  };
}

function renderWithProviders(children: ReactNode, permissions: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <PermissionsContext.Provider value={buildPermissionsState(permissions)}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PermissionsContext.Provider>,
  );
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MeuDominioPage', () => {
  it('renders assignments already scoped by the BFF for a domain manager', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      items: [
        {
          subject: 'gerenciado-1',
          email: 'gerenciado@mcad.local',
          name: 'Usuário do Domínio',
          roles: [
            {
              key: 'distribuicao.default.operador',
              domain: 'distribuicao',
              displayName: 'Operador de Distribuição',
            },
          ],
        },
      ],
      page: 0,
      size: 100,
      total: 1,
    }));

    renderWithProviders(<MeuDominioPage />, ['acessos:distribuicao:papel:visualizar']);

    expect(await screen.findByText('Usuário do Domínio')).toBeInTheDocument();
    expect(screen.getByText('Operador de Distribuição')).toBeInTheDocument();
    expect(screen.getByText('distribuicao')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
  });

  it('blocks the route when no access permission is present', () => {
    renderWithProviders(
      <RequirePermission anyOf={SCOPED_PERMISSIONS}>
        <MeuDominioPage />
      </RequirePermission>,
      [],
    );

    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
  });
});
