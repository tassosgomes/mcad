import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { portalRoutes } from './routes';

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn(), addToast: vi.fn() }),
}));

function renderPortalRoute(path: string) {
  const router = createMemoryRouter([portalRoutes], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('portalRoutes', () => {
  it('renders the auto-cadastro page within the PortalAuthProvider', async () => {
    renderPortalRoute('/portal/auto-cadastro');

    expect(await screen.findByRole('heading', { name: 'Criar Conta' })).toBeInTheDocument();
  });

  it('renders the login page within the PortalAuthProvider', async () => {
    renderPortalRoute('/portal/login');

    expect(await screen.findByRole('heading', { name: 'Portal do Titular' })).toBeInTheDocument();
  });
});
