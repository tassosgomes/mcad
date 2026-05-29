import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoricoAlteracoesTab } from './HistoricoAlteracoesTab';

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HistoricoAlteracoesTab', () => {
  it('renders data-change diff and user-action events', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      events: [
        {
          id: 'event-1',
          eventType: 'DATA_CHANGE',
          occurredAt: '2026-05-26T10:00:00Z',
          subject: { id: 'gerente.dev', name: 'Gerente DEV' },
          entityType: 'Processo',
          entityId: 'processo-1',
          action: 'APROVAR_PROCESSO',
          payload: {
            before: { status: 'CALCULADO' },
            after: { status: 'APROVADO' },
          },
          correlationId: 'corr-1',
        },
        {
          id: 'event-2',
          eventType: 'USER_ACTION',
          occurredAt: '2026-05-26T10:05:00Z',
          subject: { id: 'gerente.dev', email: 'gerente@mcad.local' },
          entityType: 'Processo',
          entityId: 'processo-1',
          action: 'EXPORTAR_PROCESSO',
        },
      ],
      page: 0,
      size: 20,
      total: 2,
    }));

    renderWithQueryClient(<HistoricoAlteracoesTab processoId="processo-1" />);

    expect(await screen.findByText('APROVAR_PROCESSO')).toBeInTheDocument();
    expect(screen.getByText('Gerente DEV')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('CALCULADO')).toBeInTheDocument();
    expect(screen.getByText('APROVADO')).toBeInTheDocument();
    expect(screen.getByText('EXPORTAR_PROCESSO')).toBeInTheDocument();
    expect(screen.getByText('Correlation ID: corr-1')).toBeInTheDocument();
  });

  it('renders a loading state while the timeline request is pending', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => undefined),
    );

    renderWithQueryClient(<HistoricoAlteracoesTab processoId="processo-1" />);

    expect(screen.getByRole('status', { name: /carregando histórico/i })).toBeInTheDocument();
  });

  it('renders an error state when the BFF is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      code: 'AUDIT_UNAVAILABLE',
      message: 'Audit unavailable',
    }, 503));

    renderWithQueryClient(<HistoricoAlteracoesTab processoId="processo-1" />);

    expect(await screen.findByText(/não foi possível carregar o histórico/i)).toBeInTheDocument();
  });

  it('renders an empty state when no events are returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      events: [],
      page: 0,
      size: 20,
      total: 0,
    }));

    renderWithQueryClient(<HistoricoAlteracoesTab processoId="processo-1" />);

    expect(await screen.findByText(/sem alterações registradas/i)).toBeInTheDocument();
  });
});
