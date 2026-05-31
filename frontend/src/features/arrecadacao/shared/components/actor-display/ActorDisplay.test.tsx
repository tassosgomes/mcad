import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActorDisplay } from './ActorDisplay';
import type { ActorDisplayResponse } from '../../types/actor';

const activeActor: ActorDisplayResponse = {
  subject: 'logto-user-1',
  label: 'Maria Silva (maria.silva)',
  username: 'maria.silva',
  displayName: 'Maria Silva',
  email: 'maria.silva@mcad.dev',
  status: 'ATIVO',
};

describe('ActorDisplay', () => {
  it('renders actor label as visible selectable text', () => {
    render(<ActorDisplay actor={activeActor} fallbackLabel="legacy-user" />);

    expect(screen.getByText('Maria Silva (maria.silva)')).toBeInTheDocument();
    expect(screen.queryByText(/suspenso/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/removido/i)).not.toBeInTheDocument();
  });

  it('uses legacy fallback when actor is not available', () => {
    render(<ActorDisplay fallbackLabel="legacy-user" />);

    expect(screen.getByText('legacy-user')).toBeInTheDocument();
  });

  it('shows suspended status as visible text and accessible name', () => {
    const suspendedActor: ActorDisplayResponse = {
      ...activeActor,
      status: 'SUSPENSO',
    };

    render(<ActorDisplay actor={suspendedActor} />);

    expect(screen.getByText('Maria Silva (maria.silva)')).toBeInTheDocument();
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
    expect(screen.getByLabelText('Maria Silva (maria.silva) - Suspenso')).toBeInTheDocument();
  });

  it('shows removed status as visible text without requiring tooltip access', () => {
    const removedActor: ActorDisplayResponse = {
      ...activeActor,
      status: 'REMOVIDO',
    };

    render(<ActorDisplay actor={removedActor} />);

    expect(screen.getByText('Maria Silva (maria.silva)')).toBeInTheDocument();
    expect(screen.getByText('Removido')).toBeInTheDocument();
    expect(screen.queryByTitle(/removido/i)).not.toBeInTheDocument();
  });
});
