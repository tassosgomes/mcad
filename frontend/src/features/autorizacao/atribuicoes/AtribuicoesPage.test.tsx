import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsContext, type PermissionsState } from '@shared/authz';
import { AtribuicoesPage } from './AtribuicoesPage';

const MANAGER_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:default:papel:atribuir',
  'acessos:default:papel:remover',
  'acessos:default:atribuicao:ver-historico',
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
            name: 'Usuário Teste',
            roles: [
              {
                assignmentId: 'user-1:role-operador',
                roleId: 'role-operador',
                key: 'distribuicao.default.operador',
                domain: 'distribuicao',
                displayName: 'Operador de Distribuição',
              },
            ],
          },
        ],
        page: 0,
        size: 50,
        total: 1,
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

    if (url.startsWith('/api/acessos/papeis')) {
      return jsonResponse({
        items: [
          {
            key: 'distribuicao.default.gerente',
            domain: 'distribuicao',
            type: 'BUSINESS',
            status: 'ACTIVE',
            critical: true,
            displayName: 'Gerente de Distribuição',
            description: 'Permite administrar rotinas de distribuição.',
          },
          {
            key: 'cadastro.default.consultor',
            domain: 'cadastro',
            type: 'BUSINESS',
            status: 'ACTIVE',
            critical: false,
            displayName: 'Consultor de Cadastro',
          },
        ],
        page: 0,
        size: 200,
        total: 2,
      });
    }

    if (url.startsWith('/api/acessos/atribuicoes/historico')) {
      return jsonResponse({
        items: [
          {
            id: 'audit-1',
            occurredAt: '2026-05-29T10:00:00.000Z',
            actorSubject: 'gestor-1',
            targetUserId: 'user-1',
            roleKey: 'distribuicao.default.operador',
            action: 'ASSIGNED',
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

describe('AtribuicoesPage', () => {
  it('searches a user, filters roles and submits a BFF assignment', async () => {
    const fetchMock = installAcessosFetchMock();
    const user = userEvent.setup();

    renderWithProviders(<AtribuicoesPage />, MANAGER_PERMISSIONS);

    expect(await screen.findByText('Usuário Teste')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Usuário'), 'novo');
    await user.click(await screen.findByText('Usuário Novo'));
    await user.selectOptions(screen.getByLabelText('Domínio'), 'distribuicao');
    await user.selectOptions(screen.getByLabelText('Criticidade'), 'critical');
    await user.selectOptions(screen.getByLabelText('Papel'), 'distribuicao.default.gerente');
    await user.click(screen.getByRole('button', { name: /^atribuir$/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === '/api/acessos/papeis/atribuir' && init?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      expect(postCall?.[1]?.body).toBe(JSON.stringify({
        userId: 'user-2',
        roleKey: 'distribuicao.default.gerente',
      }));
    });
    expect(
      await screen.findByText(/A propagação das permissões pode levar até 5 minutos/i),
    ).toBeInTheDocument();
  });

  it('requires explicit removal confirmation and shows assignment history', async () => {
    const fetchMock = installAcessosFetchMock();
    const user = userEvent.setup();

    renderWithProviders(<AtribuicoesPage />, MANAGER_PERMISSIONS);

    expect(await screen.findByText('Usuário Teste')).toBeInTheDocument();
    expect(await screen.findByText('gestor-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remover operador de distribuição/i }));

    const dialog = await screen.findByRole('dialog', { name: /confirmar remoção de papel/i });
    expect(within(dialog).getByText(/Operador de Distribuição/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Usuário Teste/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /remover papel/i }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes('/api/acessos/papeis/atribuir/') && init?.method === 'DELETE',
      );
      expect(deleteCall).toBeDefined();
    });
    expect(
      await screen.findByText(/A revogação pode levar até 5 minutos/i),
    ).toBeInTheDocument();
  });

  it('hides write and history actions for read-only access consultants while keeping the list visible', async () => {
    installAcessosFetchMock();

    renderWithProviders(<AtribuicoesPage />, ['acessos:default:papel:listar']);

    expect(await screen.findByText('Usuário Teste')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /nova atribuição/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^atribuir$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /histórico de atribuições/i })).not.toBeInTheDocument();
  });
});
