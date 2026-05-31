import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import { PagamentosTable } from './PagamentosTable';
import type { Pagamento } from '../types/pagamento';

vi.mock('@features/auditoria/components/RowAuditHistoryButton', () => ({
  RowAuditHistoryButton: () => <button type="button">Histórico</button>,
}));

const removedActor: ActorDisplayResponse = {
  subject: 'usr_removed',
  label: 'Carlos Rocha (carlos.rocha)',
  username: 'carlos.rocha',
  displayName: 'Carlos Rocha',
  email: 'carlos.rocha@mcad.dev',
  status: 'REMOVIDO',
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
    ...overrides,
  };
}

function renderTable(data: Pagamento[]) {
  return render(
    <MemoryRouter>
      <PagamentosTable data={data} />
    </MemoryRouter>,
  );
}

describe('PagamentosTable', () => {
  it('renders reversal actor with removed status in the payment list', () => {
    renderTable([createPagamento({ estornadoPorAtor: removedActor })]);

    const row = screen.getByRole('row', { name: /casa de shows alfa/i });
    expect(within(row).getByText('Estornado por')).toBeInTheDocument();
    expect(within(row).getByLabelText('Carlos Rocha (carlos.rocha) - Removido')).toBeInTheDocument();
    expect(within(row).getByText('Removido')).toBeInTheDocument();
  });

  it('renders legacy reversal author when actor payload is absent', () => {
    renderTable([createPagamento({ estornadoPorAtor: null, estornadoPor: 'legacy-estorno' })]);

    expect(screen.getByLabelText('legacy-estorno')).toBeInTheDocument();
    expect(screen.queryByText('Removido')).not.toBeInTheDocument();
  });
});
