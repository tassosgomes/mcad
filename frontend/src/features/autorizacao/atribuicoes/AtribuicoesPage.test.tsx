import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsContext, type PermissionsState } from '@shared/authz';
import { AtribuicoesPage } from './AtribuicoesPage';

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

describe('AtribuicoesPage', () => {
  it('renders the assignment form for access managers and submits a role assignment', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.startsWith('/api/acessos/assignments')) {
        return jsonResponse({
          items: [
            {
              subject: 'usuario-1',
              email: 'usuario@mcad.local',
              name: 'Usuário Teste',
              roles: [
                {
                  assignmentId: 'assignment-1',
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

      if (url === '/api/acessos/papeis') {
        return jsonResponse([
          {
            key: 'distribuicao.default.gerente',
            domain: 'distribuicao',
            displayName: 'Gerente de Distribuição',
          },
        ]);
      }

      if (url === '/api/acessos/papeis/atribuir' && init?.method === 'POST') {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({ code: 'NOT_FOUND' }, 404);
    });

    renderWithProviders(
      <AtribuicoesPage />,
      [
        'acessos:default:papel:listar',
        'acessos:default:papel:atribuir',
        'acessos:default:papel:remover',
      ],
    );

    expect(await screen.findByText('Usuário Teste')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Usuário'), 'usuario-2');
    await userEvent.selectOptions(
      screen.getByLabelText('Papel'),
      'distribuicao.default.gerente',
    );
    await userEvent.click(screen.getByRole('button', { name: /^atribuir$/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === '/api/acessos/papeis/atribuir' && init?.method === 'POST',
      );
      expect(postCall).toBeDefined();
    });
    expect(await screen.findByText('Papel atribuído com sucesso.')).toBeInTheDocument();
  });

  it('hides write actions for read-only access consultants while keeping the list visible', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.startsWith('/api/acessos/assignments')) {
        return jsonResponse({
          items: [
            {
              subject: 'consultado-1',
              email: 'consultado@mcad.local',
              name: 'Usuário Consultado',
              roles: [
                {
                  assignmentId: 'assignment-1',
                  key: 'acessos.default.consultor',
                  domain: 'acessos',
                  displayName: 'Consultor de Acessos',
                },
              ],
            },
          ],
          page: 0,
          size: 50,
          total: 1,
        });
      }

      if (url === '/api/acessos/papeis') {
        return jsonResponse([]);
      }

      return jsonResponse({ code: 'NOT_FOUND' }, 404);
    });

    renderWithProviders(<AtribuicoesPage />, ['acessos:default:papel:listar']);

    expect(await screen.findByText('Usuário Consultado')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /nova atribuição/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^atribuir$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
  });
});
