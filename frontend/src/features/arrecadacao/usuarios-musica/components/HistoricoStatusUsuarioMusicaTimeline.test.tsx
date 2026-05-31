import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActorDisplayResponse } from '../../shared/types/actor';
import { HistoricoStatusUsuarioMusicaTimeline } from './HistoricoStatusUsuarioMusicaTimeline';
import type { HistoricoStatusUsuarioMusica } from '../types/usuario-musica';

const suspendedActor: ActorDisplayResponse = {
  subject: 'usr_suspended',
  label: 'João Souza (joao.souza)',
  username: 'joao.souza',
  displayName: 'João Souza',
  email: 'joao.souza@mcad.dev',
  status: 'SUSPENSO',
};

function createEntry(
  overrides: Partial<HistoricoStatusUsuarioMusica>,
): HistoricoStatusUsuarioMusica {
  return {
    id: 'hist-usuario-1',
    statusAnterior: 'ATIVO',
    statusNovo: 'INATIVO',
    justificativa: 'Contrato encerrado',
    autor: 'legacy-user',
    data: '2026-05-21T10:15:00Z',
    ...overrides,
  };
}

describe('HistoricoStatusUsuarioMusicaTimeline', () => {
  it('renders actor display with suspended status and keeps transition metadata visible', () => {
    render(<HistoricoStatusUsuarioMusicaTimeline historico={[createEntry({ ator: suspendedActor })]} />);

    expect(screen.getByLabelText('João Souza (joao.souza) - Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
    expect(screen.getByText('Contrato encerrado')).toBeInTheDocument();
  });

  it('renders legacy author when actor payload is absent', () => {
    render(
      <HistoricoStatusUsuarioMusicaTimeline
        historico={[createEntry({ ator: null, autor: 'legacy-usuario' })]}
      />,
    );

    expect(screen.getByLabelText('legacy-usuario')).toBeInTheDocument();
    expect(screen.queryByText('Suspenso')).not.toBeInTheDocument();
  });
});
