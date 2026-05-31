import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import { HistoricoStatusTimeline } from './HistoricoStatusTimeline';
import type { HistoricoStatusLicenca } from '../types/licenca';

const removedActor: ActorDisplayResponse = {
  subject: 'usr_removed',
  label: 'Maria Silva (maria.silva)',
  username: 'maria.silva',
  displayName: 'Maria Silva',
  email: 'maria.silva@mcad.dev',
  status: 'REMOVIDO',
};

function createEntry(
  overrides: Partial<HistoricoStatusLicenca>,
): HistoricoStatusLicenca {
  return {
    id: 'hist-1',
    statusAnterior: 'ATIVA',
    statusNovo: 'SUSPENSA',
    justificativa: 'Pendência documental',
    autor: 'legacy-user',
    data: '2026-05-20T14:30:00Z',
    ...overrides,
  };
}

describe('HistoricoStatusTimeline', () => {
  it('renders actor display with removed status without hiding status transition and reason', () => {
    render(<HistoricoStatusTimeline historico={[createEntry({ ator: removedActor })]} />);

    expect(screen.getByLabelText('Maria Silva (maria.silva) - Removido')).toBeInTheDocument();
    expect(screen.getByText('Removido')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Suspensa')).toBeInTheDocument();
    expect(screen.getByText('Pendência documental')).toBeInTheDocument();
  });

  it('renders legacy author when actor payload is absent', () => {
    render(<HistoricoStatusTimeline historico={[createEntry({ ator: null, autor: 'legacy-author' })]} />);

    expect(screen.getByLabelText('legacy-author')).toBeInTheDocument();
    expect(screen.queryByText('Removido')).not.toBeInTheDocument();
  });
});
