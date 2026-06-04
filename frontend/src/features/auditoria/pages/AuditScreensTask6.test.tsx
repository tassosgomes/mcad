import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuditEventDetailPanel } from '../components/AuditEventDetailPanel';
import { AuditCatalogPage } from './AuditCatalogPage';
import { AuditTimelinePage } from './AuditTimelinePage';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

function renderWithQueryClient(node: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {node}
    </QueryClientProvider>,
  );
}

const catalogResponse = {
  version: '2026-06-04.task-6',
  items: [
    {
      id: 'cadastro.titulares.lista',
      aliases: ['CADASTRO_TITULARES'],
      domain: 'cadastro',
      friendlyName: 'Cadastro - Titulares',
      routePatterns: ['/api/cadastro/v1/titulares'],
      methods: ['GET'],
      level: 'GOLD',
      justification: 'Expõe dados pessoais de titulares.',
      retentionDays: 90,
    },
    {
      id: 'cadastro.obras.lista',
      aliases: ['CADASTRO_OBRAS'],
      domain: 'cadastro',
      friendlyName: 'Cadastro - Obras',
      routePatterns: ['/api/cadastro/v1/obras'],
      methods: ['GET'],
      level: 'SILVER',
      justification: 'Expõe relações autorais.',
      retentionDays: 90,
    },
  ],
};

describe('Audit task 6 screens', () => {
  it('renders the catalog and filters by audit level', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(catalogResponse));

    renderWithQueryClient(<AuditCatalogPage />);

    expect(await screen.findByRole('heading', { name: 'Cadastro - Titulares' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cadastro - Obras' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Nível'), 'GOLD');

    expect(screen.getByRole('heading', { name: 'Cadastro - Titulares' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cadastro - Obras' })).not.toBeInTheDocument();
  });

  it('submits event filters through the friendly BFF endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      page: 0,
      size: 20,
      items: [
        {
          eventId: 'evt-1',
          eventType: 'SCREEN_ACCESS',
          occurredAt: '2026-06-04T12:00:00.000Z',
          actor: { displayName: 'Auditor Teste' },
          screen: {
            screenId: 'cadastro.titulares.lista',
            screenName: 'Cadastro - Titulares',
            auditLevel: 'GOLD',
            businessContext: { entityType: 'Titular', businessCode: 'DOC-123' },
          },
        },
      ],
    }));

    renderWithQueryClient(<AuditTimelinePage />);

    await userEvent.selectOptions(screen.getByLabelText('Nível'), 'GOLD');
    await userEvent.type(screen.getByLabelText('Contexto de negócio'), 'DOC-123');
    await userEvent.click(screen.getByRole('button', { name: /buscar eventos/i }));

    expect(await screen.findByText('Consulta em Cadastro · Titulares')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/auditoria/eventos?'),
        expect.any(Object),
      );
    });

    const requestedUrl = String(fetchMock.mock.calls.at(-1)?.[0]);
    expect(requestedUrl).toContain('auditLevel=GOLD');
    expect(requestedUrl).toContain('context=DOC-123');
  });

  it('shows Silver event route and business context without snapshot', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      eventId: 'evt-silver',
      schemaVersion: 1,
      eventType: 'SCREEN_ACCESS',
      occurredAt: '2026-06-04T12:00:00.000Z',
      actor: { displayName: 'Maria Auditoria' },
      origin: { route: '/api/cadastro/v1/obras', screenId: 'cadastro.obras.lista' },
      screen: {
        screenId: 'cadastro.obras.lista',
        screenName: 'Cadastro - Obras',
        auditLevel: 'SILVER',
        businessContext: {
          filters: { titulo: 'Aquarela' },
          businessCode: 'ISWC-1',
        },
      },
    }));

    renderWithQueryClient(<AuditEventDetailPanel eventId="evt-silver" />);

    expect(await screen.findByText('Filtros e contexto de negócio')).toBeInTheDocument();
    expect(screen.getAllByText('/api/cadastro/v1/obras').length).toBeGreaterThan(0);
    expect(screen.queryByText('Snapshot Ouro')).not.toBeInTheDocument();
  });

  it('renders authorized Gold snapshot content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      eventId: 'evt-gold',
      schemaVersion: 1,
      eventType: 'SCREEN_ACCESS',
      occurredAt: '2026-06-04T12:00:00.000Z',
      actor: { displayName: 'João Consulta' },
      origin: { route: '/api/cadastro/v1/titulares', screenId: 'cadastro.titulares.lista' },
      screen: {
        screenId: 'cadastro.titulares.lista',
        screenName: 'Cadastro - Titulares',
        auditLevel: 'GOLD',
        businessContext: {
          businessCode: 'CPF-001',
          snapshot: {
            statusCode: 200,
            capturedAtUtc: '2026-06-04T12:00:01.000Z',
            contentHash: 'hash-123',
            body: { titular: { nome: 'Titular Exposto', documento: 'CPF-001' } },
          },
        },
      },
    }));

    renderWithQueryClient(<AuditEventDetailPanel eventId="evt-gold" />);

    expect(await screen.findByText('Snapshot Ouro')).toBeInTheDocument();
    expect(screen.getAllByText(/Titular Exposto/).length).toBeGreaterThan(0);
    expect(screen.getByText('hash-123')).toBeInTheDocument();
  });

  it('shows a clear 403 state and does not render sensitive snapshot data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(
      {
        code: 'FORBIDDEN',
        message: 'Snapshot access requires auditoria:default:snapshot:visualizar',
      },
      { status: 403 },
    ));

    renderWithQueryClient(<AuditEventDetailPanel eventId="evt-gold-denied" />);

    expect(await screen.findByText('Snapshot Ouro restrito.')).toBeInTheDocument();
    expect(screen.queryByText('Titular Exposto')).not.toBeInTheDocument();
    expect(screen.queryByText('CPF-001')).not.toBeInTheDocument();
  });
});
