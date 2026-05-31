import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import type { UdaValor } from '../types/uda';
import { useUdaVigente } from '../hooks/useUdaVigente';
import { UdaVigenteCard } from './UdaVigenteCard';

vi.mock('../hooks/useUdaVigente', () => ({
  useUdaVigente: vi.fn(),
}));

const useUdaVigenteMock = vi.mocked(useUdaVigente);

const suspendedActor: ActorDisplayResponse = {
  subject: 'usr_suspended',
  label: 'Ana Costa (ana.costa)',
  username: 'ana.costa',
  displayName: 'Ana Costa',
  email: 'ana.costa@mcad.dev',
  status: 'SUSPENSO',
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

describe('UdaVigenteCard', () => {
  beforeEach(() => {
    useUdaVigenteMock.mockReturnValue({
      data: createUda({ criadoPorAtor: suspendedActor }),
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useUdaVigente>);
  });

  it('renders actor display with suspended status for current UDA', () => {
    render(<UdaVigenteCard onAjustar={vi.fn()} isAnalista={false} />);

    expect(screen.getByText('Configurado por')).toBeInTheDocument();
    expect(screen.getByLabelText('Ana Costa (ana.costa) - Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Vigente desde 01/05/2026')).toBeInTheDocument();
  });

  it('renders legacy creator when actor payload is absent', () => {
    useUdaVigenteMock.mockReturnValue({
      data: createUda({ criadoPorAtor: null, criadoPor: 'legacy-uda' }),
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useUdaVigente>);

    render(<UdaVigenteCard onAjustar={vi.fn()} isAnalista={false} />);

    expect(screen.getByLabelText('legacy-uda')).toBeInTheDocument();
    expect(screen.queryByText('Suspenso')).not.toBeInTheDocument();
  });
});
