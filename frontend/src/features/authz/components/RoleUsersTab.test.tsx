import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsContext, type PermissionsState } from '@shared/authz';
import { ToastProvider } from '@components/ui/toast';
import { RoleUsersTab } from './RoleUsersTab';

const MANAGER_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:default:papel:atribuir',
  'acessos:default:papel:remover',
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

function renderWithProviders(node: ReactNode, permissions: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <PermissionsContext.Provider value={buildPermissionsState(permissions)}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{node}</ToastProvider>
      </QueryClientProvider>
    </PermissionsContext.Provider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installAcessosFetchMock() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.startsWith('/api/acessos/assignments')) {
      return jsonResponse({
        items: [
          {
            subject: 'usuario-1',
            userId: 'user-1',
            email: 'usuario@mcad.local',
            name: 'Usuário Existente',
            roles: [
              {
                assignmentId: 'user-1:role-distribuicao-operador',
                roleId: 'role-distribuicao-operador',
                key: 'distribuicao.default.operador',
                domain: 'distribuicao',
                displayName: 'Operador de Distribuição',
              },
            ],
          },
          {
            subject: 'usuario-99',
            userId: 'user-99',
            email: 'noise@mcad.local',
            name: 'Usuário Sem Esse Papel',
            roles: [
              {
                assignmentId: 'user-99:role-outro',
                roleId: 'role-outro',
                key: 'cadastro.default.consultor',
                domain: 'cadastro',
                displayName: 'Consultor de Cadastro',
              },
            ],
          },
        ],
        page: 0,
        size: 200,
        total: 2,
      });
    }

    if (url.startsWith('/api/acessos/usuarios')) {
      return jsonResponse({
        items: [
          {
            id: 'user-2',
            subject: 'usuario-2',
            email: 'novo@mcad.local',
            name: 'Usuário Novo',
            status: 'ACTIVE',
          },
        ],
        page: 0,
        size: 10,
        total: 1,
      });
    }

    if (url === '/api/acessos/papeis/atribuir' && init?.method === 'POST') {
      return new Response(null, { status: 204 });
    }

    if (url.includes('/api/acessos/papeis/atribuir/') && init?.method === 'DELETE') {
      return new Response(null, { status: 204 });
    }

    return jsonResponse({ code: 'NOT_FOUND' }, 404);
  });
}

describe('RoleUsersTab', () => {
  it('only lists users that already have the target role', async () => {
    installAcessosFetchMock();
    renderWithProviders(
      <RoleUsersTab
        roleKey="distribuicao.default.operador"
        roleDisplayName="Operador de Distribuição"
        isInactive={false}
      />,
      MANAGER_PERMISSIONS,
    );

    expect(await screen.findByText('Usuário Existente')).toBeInTheDocument();
    expect(screen.queryByText('Usuário Sem Esse Papel')).not.toBeInTheDocument();
    expect(screen.getByText(/1 usuário possui este papel/i)).toBeInTheDocument();
  });

  it('assigns a new user to the role through the role-centric flow', async () => {
    const fetchMock = installAcessosFetchMock();
    const user = userEvent.setup();

    renderWithProviders(
      <RoleUsersTab
        roleKey="distribuicao.default.operador"
        roleDisplayName="Operador de Distribuição"
        isInactive={false}
      />,
      MANAGER_PERMISSIONS,
    );

    expect(await screen.findByText('Usuário Existente')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Adicionar usuário'), 'novo');
    await user.click(await screen.findByText('Usuário Novo'));
    await user.click(screen.getByRole('button', { name: /atribuir papel/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === '/api/acessos/papeis/atribuir' && init?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      expect(postCall?.[1]?.body).toBe(JSON.stringify({
        userId: 'user-2',
        roleKey: 'distribuicao.default.operador',
      }));
    });
    expect(
      await screen.findByText(/recebeu o papel/i),
    ).toBeInTheDocument();
  });

  it('confirms removal before calling the BFF DELETE', async () => {
    const fetchMock = installAcessosFetchMock();
    const user = userEvent.setup();

    renderWithProviders(
      <RoleUsersTab
        roleKey="distribuicao.default.operador"
        roleDisplayName="Operador de Distribuição"
        isInactive={false}
      />,
      MANAGER_PERMISSIONS,
    );

    await user.click(
      await screen.findByRole('button', { name: /remover operador de distribuição de usuário existente/i }),
    );

    const dialog = await screen.findByRole('dialog', { name: /remover papel do usuário/i });
    expect(within(dialog).getByText(/Operador de Distribuição/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Usuário Existente/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /remover papel/i }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes('/api/acessos/papeis/atribuir/') && init?.method === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it('hides write actions when the actor only has read permissions', async () => {
    installAcessosFetchMock();
    renderWithProviders(
      <RoleUsersTab
        roleKey="distribuicao.default.operador"
        roleDisplayName="Operador de Distribuição"
        isInactive={false}
      />,
      ['acessos:default:papel:listar'],
    );

    expect(await screen.findByText('Usuário Existente')).toBeInTheDocument();
    expect(screen.queryByLabelText('Adicionar usuário')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /atribuir papel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remover/i })).not.toBeInTheDocument();
  });
});
