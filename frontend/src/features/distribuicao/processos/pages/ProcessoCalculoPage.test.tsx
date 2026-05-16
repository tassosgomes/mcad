import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@shared/auth/AuthContext';
import { PermissionsContext } from '@shared/authz';
import type { PermissionsState } from '@shared/authz';
import type { CalculoProcessoResponse } from '../types/calculo';
import { ProcessoCalculoPage } from './ProcessoCalculoPage';

const processoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CALCULAR_PERMISSION = 'distribuicao:default:processo:calcular';

function calculoResponse(overrides: Partial<CalculoProcessoResponse> = {}): CalculoProcessoResponse {
  return {
    processoId,
    status: 'CALCULADO',
    rubricaSigla: 'TV',
    periodo: '2026-05',
    resumo: {
      verbaLiquida: '1000.00',
      totalExecucoes: 10,
      totalPontos: '10.000000',
      totalObras: 1,
      totalCreditos: 1,
      valorTotalCalculado: '1000.00',
      calculadoEm: '2026-05-07T18:10:00Z',
    },
    creditos: {
      items: [
        {
          id: 'credito-1',
          titularId: '11111111-1111-1111-1111-111111111111',
          titularNome: 'Titular Inicial',
          obraId: '22222222-2222-2222-2222-222222222222',
          obraTitulo: 'Obra Inicial',
          fonogramaId: null,
          categoria: 'AUTORAL',
          subcategoriaConexa: null,
          percentualAplicado: '100.000000',
          valorObra: '1000.00',
          valorCredito: '1000.00',
          pontosObra: '10.000000',
          status: 'CALCULADO',
          criadoEm: '2026-05-07T18:10:00Z',
        },
      ],
      metadata: {
        page: 0,
        size: 20,
        total: 1,
        totalPages: 1,
      },
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPermissionsState(permissions: string[]): PermissionsState {
  const set = new Set(permissions);
  return {
    permissions: set,
    version: 1,
    isLoading: false,
    error: null,
    can: (permission: string) => set.has(permission),
    hasAny: (perms: string[]) => perms.some((p) => set.has(p)),
    hasAll: (perms: string[]) => perms.every((p) => set.has(p)),
    reload: () => undefined,
  };
}

function renderPage(
  children: ReactNode,
  permissions: string[],
  initialEntry = `/processos/${processoId}`,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const authValue: AuthContextValue = {
    user: null,
    isAuthenticated: true,
    isLoggingOut: false,
    roles: [],
    login: async () => undefined,
    logout: async () => undefined,
    getToken: () => 'token-123',
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <PermissionsContext.Provider value={buildPermissionsState(permissions)}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialEntry]}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </PermissionsContext.Provider>
    </AuthContext.Provider>,
  );
}

function renderRoute(permissions: string[]) {
  return renderPage(
    <Routes>
      <Route path="/processos/:id" element={<ProcessoCalculoPage />} />
    </Routes>,
    permissions,
  );
}

describe('ProcessoCalculoPage', () => {
  it('loads the review route with summary and first credit page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(calculoResponse()));

    renderRoute([CALCULAR_PERMISSION]);

    expect(await screen.findByRole('heading', { name: /processo aaaaaaaa/i })).toBeInTheDocument();
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Titular Inicial')).toBeInTheDocument();
    expect(screen.getByText('Obra Inicial')).toBeInTheDocument();
  });

  it('does not render an enabled calculate action for consultants', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(calculoResponse({
      status: 'CRIADO',
      resumo: {
        verbaLiquida: '1000.00',
        totalExecucoes: 0,
        totalPontos: '0.000000',
        totalObras: 0,
        totalCreditos: 0,
        valorTotalCalculado: '0.00',
        calculadoEm: null,
      },
      creditos: {
        items: [],
        metadata: { page: 0, size: 20, total: 0, totalPages: 0 },
      },
    })));

    renderRoute([]);

    expect(await screen.findByText(/consulta em modo somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /calcular/i })).not.toBeInTheDocument();
  });

  it('refreshes review data after analyst clicks calculate', async () => {
    const updated = calculoResponse({
      creditos: {
        items: [
          {
            ...calculoResponse().creditos.items[0],
            id: 'credito-2',
            titularNome: 'Titular Depois',
            obraTitulo: 'Obra Depois',
          },
        ],
        metadata: { page: 0, size: 20, total: 1, totalPages: 1 },
      },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(calculoResponse({
        status: 'CRIADO',
        resumo: {
          verbaLiquida: '1000.00',
          totalExecucoes: 0,
          totalPontos: '0.000000',
          totalObras: 0,
          totalCreditos: 0,
          valorTotalCalculado: '0.00',
          calculadoEm: null,
        },
        creditos: {
          items: [],
          metadata: { page: 0, size: 20, total: 0, totalPages: 0 },
        },
      })))
      .mockResolvedValueOnce(jsonResponse({ processoId, status: 'CALCULADO' }))
      .mockResolvedValueOnce(jsonResponse(updated));

    renderRoute([CALCULAR_PERMISSION]);

    await userEvent.click(await screen.findByRole('button', { name: /calcular/i }));

    expect(await screen.findByText('Titular Depois')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe(
      `/api/distribuicao/v1/processos/${processoId}/calcular`,
    );
  });

  it('shows backend ProblemDetail from calculation failure as an actionable error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(calculoResponse({
        status: 'CRIADO',
        creditos: {
          items: [],
          metadata: { page: 0, size: 20, total: 0, totalPages: 0 },
        },
      })))
      .mockResolvedValueOnce(jsonResponse({
        status: 422,
        title: 'Pré-requisitos inválidos',
        detail: 'Rol fechado não encontrado para o processo.',
      }, 422));

    renderRoute([CALCULAR_PERMISSION]);

    await userEvent.click(await screen.findByRole('button', { name: /calcular/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível calcular o processo.');
    expect(alert).toHaveTextContent('Rol fechado não encontrado para o processo.');
    expect(within(alert).getByRole('button', { name: /tentar novamente/i })).toBeEnabled();
  });

  it('shows an error state when the process id is missing', async () => {
    renderPage(
      <Routes>
        <Route path="/processos" element={<ProcessoCalculoPage />} />
      </Routes>,
      [CALCULAR_PERMISSION],
      '/processos',
    );

    expect(screen.getByText('Processo de distribuição não informado.')).toBeInTheDocument();
  });

  it('shows ProblemDetail from review load failure with retry action', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      status: 404,
      title: 'Não encontrado',
      detail: 'Processo de distribuição não encontrado.',
    }, 404));

    renderRoute([CALCULAR_PERMISSION]);

    expect(await screen.findByText('Processo de distribuição não encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
