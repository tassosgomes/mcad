import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePermission } from '../hooks/usePermissionLifecycle';
import { PermissionCreatePage } from './PermissionCreatePage';

vi.mock('../hooks/usePermissionLifecycle', () => ({
  useCreatePermission: vi.fn(),
}));

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const useCreatePermissionMock = vi.mocked(useCreatePermission);

function renderPage() {
  return render(
    <MemoryRouter>
      <PermissionCreatePage />
    </MemoryRouter>,
  );
}

describe('PermissionCreatePage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    useCreatePermissionMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({
        id: 'perm-new',
        key: 'cadastro:obras:obra:aprovar',
        displayName: 'Aprovar obra',
        description: null,
        domain: 'cadastro',
        area: 'obras',
        resource: 'obra',
        action: 'aprovar',
        serviceName: 'ecad-authz-service',
        status: 'ACTIVE',
        createdAt: '2026-06-13T00:00:00Z',
        updatedAt: '2026-06-13T00:00:00Z',
      }),
    } as unknown as ReturnType<typeof useCreatePermission>);
  });

  it('builds the permission key and submits the final create payload', async () => {
    const user = userEvent.setup();
    const createMutation = vi.fn().mockResolvedValue({
      id: 'perm-new',
      status: 'ACTIVE',
    });
    useCreatePermissionMock.mockReturnValue({
      isPending: false,
      mutateAsync: createMutation,
    } as unknown as ReturnType<typeof useCreatePermission>);

    renderPage();

    await user.type(screen.getByLabelText(/área/i), 'Obras');
    await user.type(screen.getByLabelText(/recurso/i), 'Obra');
    await user.type(screen.getByLabelText(/ação/i), 'Aprovar');
    await user.type(screen.getByLabelText(/nome de exibição/i), 'Aprovar obra');
    await user.type(screen.getByLabelText(/descrição/i), 'Permite aprovar obras.');

    expect(screen.getByText('cadastro:obras:obra:aprovar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar permissão/i }));

    await waitFor(() => {
      expect(createMutation).toHaveBeenCalledWith({
        key: 'cadastro:obras:obra:aprovar',
        displayName: 'Aprovar obra',
        description: 'Permite aprovar obras.',
        domain: 'cadastro',
        area: 'obras',
        resource: 'obra',
        action: 'aprovar',
      });
    });
    expect(navigateMock).toHaveBeenCalledWith('/autorizacao/permissoes/perm-new');
  });

  it('does not submit when required segments are missing', async () => {
    const user = userEvent.setup();
    const createMutation = vi.fn();
    useCreatePermissionMock.mockReturnValue({
      isPending: false,
      mutateAsync: createMutation,
    } as unknown as ReturnType<typeof useCreatePermission>);

    renderPage();

    await user.click(screen.getByRole('button', { name: /cadastrar permissão/i }));

    expect(createMutation).not.toHaveBeenCalled();
  });
});
