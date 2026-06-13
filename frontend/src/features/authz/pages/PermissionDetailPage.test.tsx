import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Permission } from '../types/permission';
import { useDeprecatePermissionGoverned } from '../hooks/usePermissionLifecycle';
import { usePermissionDetails } from '../hooks/usePermissionsCatalog';
import { PermissionDetailPage } from './PermissionDetailPage';

vi.mock('../hooks/usePermissionsCatalog', () => ({
  usePermissionDetails: vi.fn(),
}));

vi.mock('../hooks/usePermissionLifecycle', () => ({
  useDeprecatePermissionGoverned: vi.fn(),
}));

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const usePermissionDetailsMock = vi.mocked(usePermissionDetails);
const useDeprecatePermissionGovernedMock = vi.mocked(useDeprecatePermissionGoverned);

function createPermission(status: Permission['status']): Permission {
  return {
    id: 'perm-1',
    key: 'cadastro:obras:obra:visualizar',
    displayName: 'Visualizar obra',
    description: 'Permite visualizar obras.',
    domain: 'cadastro',
    area: 'obras',
    resource: 'obra',
    action: 'visualizar',
    serviceName: 'cadastro-api',
    status,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/autorizacao/permissoes/perm-1']}>
      <Routes>
        <Route path="/autorizacao/permissoes/:id" element={<PermissionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PermissionDetailPage', () => {
  beforeEach(() => {
    useDeprecatePermissionGovernedMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDeprecatePermissionGoverned>);
  });

  it('does not offer the deprecate CTA for disabled permissions mapped as removed', () => {
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('DISABLED'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);

    renderPage();

    expect(screen.getByText('Removida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /depreciar permissão/i })).not.toBeInTheDocument();
  });

  it('keeps the deprecate CTA available for active permissions', async () => {
    const mutate = vi.fn();
    useDeprecatePermissionGovernedMock.mockReturnValue({
      isPending: false,
      mutate,
    } as unknown as ReturnType<typeof useDeprecatePermissionGoverned>);
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('ACTIVE'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /depreciar permissão/i }));

    expect(screen.getByText(/depreciar a permissão/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
