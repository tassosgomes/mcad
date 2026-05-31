import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import type { UdaValor } from '../types/uda';
import { useHistoricoUda } from '../hooks/useHistoricoUda';
import { useUdaVigente } from '../hooks/useUdaVigente';
import { UdaHistoricoTable } from './UdaHistoricoTable';

vi.mock('@features/auditoria/components/RowAuditHistoryButton', () => ({
  RowAuditHistoryButton: () => <button type="button">Histórico</button>,
}));

vi.mock('../hooks/useHistoricoUda', () => ({
  useHistoricoUda: vi.fn(),
}));

vi.mock('../hooks/useUdaVigente', () => ({
  useUdaVigente: vi.fn(),
}));

const useHistoricoUdaMock = vi.mocked(useHistoricoUda);
const useUdaVigenteMock = vi.mocked(useUdaVigente);

const removedActor: ActorDisplayResponse = {
  subject: 'usr_removed',
  label: 'Paula Lima (paula.lima)',
  username: 'paula.lima',
  displayName: 'Paula Lima',
  email: 'paula.lima@mcad.dev',
  status: 'REMOVIDO',
};

function createUda(overrides: Partial<UdaValor>): UdaValor {
  return {
    id: 'uda-1',
    valor: '107.310000',
    dataVigencia: '2026-05-01',
    criadoEm: '2026-05-01T12:00:00Z',
    criadoPor: 'legacy-uda',
    ...overrides,
  };
}

describe('UdaHistoricoTable', () => {
  beforeEach(() => {
    useUdaVigenteMock.mockReturnValue({
      data: createUda({ dataVigencia: '2026-05-01' }),
    } as ReturnType<typeof useUdaVigente>);
  });

  it('renders actor display with removed status in history rows', () => {
    useHistoricoUdaMock.mockReturnValue({
      data: [createUda({ criadoPorAtor: removedActor })],
      isLoading: false,
    } as ReturnType<typeof useHistoricoUda>);

    render(<UdaHistoricoTable />);

    const actor = screen.getByLabelText('Paula Lima (paula.lima) - Removido');
    const row = actor.closest('tr');
    if (!row) {
      throw new Error('Expected actor to be rendered inside a table row');
    }

    expect(within(row).getByLabelText('Paula Lima (paula.lima) - Removido')).toBeInTheDocument();
    expect(within(row).getByText('Removido')).toBeInTheDocument();
    expect(within(row).getByText('Vigente')).toBeInTheDocument();
  });

  it('renders legacy creator when actor payload is absent', () => {
    useHistoricoUdaMock.mockReturnValue({
      data: [createUda({ id: 'uda-legacy', criadoPorAtor: null, criadoPor: 'legacy-creator' })],
      isLoading: false,
    } as ReturnType<typeof useHistoricoUda>);

    render(<UdaHistoricoTable />);

    expect(screen.getByLabelText('legacy-creator')).toBeInTheDocument();
    expect(screen.queryByText('Removido')).not.toBeInTheDocument();
  });
});
