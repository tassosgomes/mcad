import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import { usePagamento } from '../hooks/usePagamento';
import { PagamentoDetailPage } from './PagamentoDetailPage';
import type { Pagamento } from '../types/pagamento';

vi.mock('@shared/authz', () => ({
  usePermissions: () => ({ can: () => false }),
}));

vi.mock('../hooks/usePagamento', () => ({
  usePagamento: vi.fn(),
}));

vi.mock('../components/EstornarPagamentoModal', () => ({
  EstornarPagamentoModal: () => null,
}));

const usePagamentoMock = vi.mocked(usePagamento);

const suspendedActor: ActorDisplayResponse = {
  subject: 'usr_suspended',
  label: 'Bruna Dias (bruna.dias)',
  username: 'bruna.dias',
  displayName: 'Bruna Dias',
  email: 'bruna.dias@mcad.dev',
  status: 'SUSPENSO',
};

function createPagamento(overrides: Partial<Pagamento>): Pagamento {
  return {
    id: 'pagamento-1',
    licenca: {
      id: 'licenca-1',
      status: 'ATIVA',
      usuarioMusica: { id: 'usuario-1', razaoSocial: 'Casa de Shows Alfa', cnpj: '12345678000190' },
      rubrica: { id: 'rubrica-1', sigla: 'SHOW', nome: 'Execução pública' },
    },
    quantidadeUdas: '10.000000',
    valorUdaNoMomento: '107.310000',
    valorBruto: '1073.100000',
    periodo: '2026-05',
    status: 'ESTORNADO',
    dataRegistro: '2026-05-10T12:00:00Z',
    atualizadoEm: '2026-05-11T12:00:00Z',
    justificativaEstorno: 'Pagamento duplicado',
    estornadoPor: 'legacy-pagamento',
    estornadoEm: '2026-05-11T12:00:00Z',
    boletoNossoNumero: null,
    boletoLinhaDigitavel: null,
    boletoCodigoBarras: null,
    boletoVencimento: null,
    boletoEmitidoEm: null,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/arrecadacao/pagamentos/pagamento-1']}>
        <Routes>
          <Route path="/arrecadacao/pagamentos/:id" element={<PagamentoDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PagamentoDetailPage', () => {
  beforeEach(() => {
    usePagamentoMock.mockReturnValue({
      data: createPagamento({ estornadoPorAtor: suspendedActor }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePagamento>);
  });

  it('renders reversal actor with suspended status and keeps reversal details visible', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /dados do estorno/i })).toBeInTheDocument();
    expect(screen.getByText('Pagamento duplicado')).toBeInTheDocument();
    expect(screen.getByLabelText('Bruna Dias (bruna.dias) - Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
    expect(screen.getByText(/11\/05\/2026/)).toBeInTheDocument();
  });

  it('renders legacy reversal author when actor payload is absent', () => {
    usePagamentoMock.mockReturnValue({
      data: createPagamento({ estornadoPorAtor: null, estornadoPor: 'legacy-estorno' }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePagamento>);

    renderPage();

    expect(screen.getByLabelText('legacy-estorno')).toBeInTheDocument();
    expect(screen.queryByText('Suspenso')).not.toBeInTheDocument();
  });
});
