import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@components/ui/toast';
import { PermissionsContext, type PermissionsState } from '@shared/authz';
import type { Processo } from '../types/processo';
import { ProcessoDetailPage } from './ProcessoDetailPage';

const processoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function processoFixture(overrides: Partial<Processo> = {}): Processo {
  return {
    id: processoId,
    rubrica: { sigla: 'TV', nome: 'Televisão Aberta' },
    periodo: '2026-05',
    status: 'CALCULADO',
    verbaLiquida: 1000,
    totalExecucoes: 10,
    analistaResponsavel: 'analista.dev',
    criadoEm: '2026-05-01T10:00:00Z',
    calculadoEm: '2026-05-02T10:00:00Z',
    aprovadoEm: null,
    finalizadoEm: null,
    canceladoEm: null,
    justificativaCancelamento: null,
    ...overrides,
  };
}

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
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/processos/${processoId}`]}>
            {children}
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </PermissionsContext.Provider>,
  );
}

function renderRoute(permissions: string[]) {
  renderWithProviders(
    <Routes>
      <Route path="/processos/:id" element={<ProcessoDetailPage />} />
    </Routes>,
    permissions,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockProcessoAndHistorico(processo: Processo) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);

    if (url === `/api/distribuicao/v1/processos/${processoId}`) {
      return jsonResponse(processo);
    }

    if (url === `/api/distribuicao/processos/${processoId}/historico`) {
      return jsonResponse({
        events: [
          {
            id: 'event-1',
            eventType: 'DATA_CHANGE',
            occurredAt: '2026-05-26T10:00:00Z',
            subject: { id: 'gerente.dev', name: 'Gerente DEV' },
            entityType: 'Processo',
            entityId: processoId,
            action: 'FINALIZAR_PROCESSO',
            payload: {
              before: { status: 'APROVADO' },
              after: { status: 'FINALIZADO' },
            },
          },
        ],
        page: 0,
        size: 20,
        total: 1,
      });
    }

    return jsonResponse({ status: 404, detail: 'Not found' }, 404);
  });
}

describe('ProcessoDetailPage', () => {
  it('shows the history tab for managers and loads the timeline when selected', async () => {
    mockProcessoAndHistorico(processoFixture());

    renderRoute(['distribuicao:default:processo:ver-historico-alteracoes']);

    const historyTab = await screen.findByRole('tab', { name: /histórico de alterações/i });
    await userEvent.click(historyTab);

    expect(await screen.findByText('FINALIZAR_PROCESSO')).toBeInTheDocument();
    expect(screen.getByText('APROVADO')).toBeInTheDocument();
    expect(screen.getByText('FINALIZADO')).toBeInTheDocument();
  });

  it('hides the history tab for analysts without the history permission', async () => {
    mockProcessoAndHistorico(processoFixture());

    renderRoute(['distribuicao:default:processo:calcular']);

    expect(await screen.findByText('Dados do Processo')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /histórico/i })).not.toBeInTheDocument();
  });

  it('hides cancellation justification for consultants without the sensitive permission', async () => {
    mockProcessoAndHistorico(processoFixture({
      status: 'CANCELADO',
      canceladoEm: '2026-05-03T10:00:00Z',
      justificativaCancelamento: 'Erro operacional sensível',
    }));

    renderRoute(['distribuicao:default:processo:listar']);

    expect(await screen.findByText('Dados do Processo')).toBeInTheDocument();
    expect(screen.queryByText('Dados do Cancelamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Erro operacional sensível')).not.toBeInTheDocument();
  });

  it('shows export action only when the export permission is present', async () => {
    mockProcessoAndHistorico(processoFixture());

    renderRoute(['distribuicao:default:processo:exportar']);

    expect(await screen.findByRole('button', { name: /exportar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
  });
});
