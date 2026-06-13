import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionPage } from '../types/permission';
import { usePermissionLifecycleCapabilities } from '../hooks/usePermissionLifecycle';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import { PermissionsPage } from './PermissionsPage';

vi.mock('../hooks/usePermissionsCatalog', () => ({
  usePermissionsCatalog: vi.fn(),
}));

vi.mock('../hooks/usePermissionLifecycle', () => ({
  usePermissionLifecycleCapabilities: vi.fn(),
}));

const usePermissionsCatalogMock = vi.mocked(usePermissionsCatalog);
const usePermissionLifecycleCapabilitiesMock = vi.mocked(usePermissionLifecycleCapabilities);

const permissionsPage: PermissionPage = {
  content: [
    {
      id: 'perm-disabled',
      key: 'cadastro:obras:obra:remover',
      displayName: 'Remover obra',
      domain: 'cadastro',
      area: 'obras',
      status: 'DISABLED',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

function mockPermissionsCatalog(data: PermissionPage = permissionsPage) {
  usePermissionsCatalogMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePermissionsCatalog>);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PermissionsPage />
    </MemoryRouter>,
  );
}

describe('PermissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionLifecycleCapabilitiesMock.mockReturnValue({
      canCreate: true,
      canDeprecate: true,
      canListLinkedRoles: true,
      canReactivate: true,
      canRemove: true,
    });
    mockPermissionsCatalog();
  });

  it('starts the listing focused on active permissions instead of removed permissions', () => {
    renderPage();

    expect(usePermissionsCatalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      0,
      20,
    );
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('ACTIVE');
    expect(screen.queryByRole('option', { name: /todos/i })).not.toBeInTheDocument();
    expect(screen.getByText(/selecione removidas/i)).toBeInTheDocument();
  });

  it('submits the explicit removed filter and renders DISABLED as Removida', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'DISABLED');
    await user.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(usePermissionsCatalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'DISABLED' }),
      0,
      20,
    );

    const row = screen.getByRole('row', { name: /remover obra/i });
    expect(within(row).getByText('Removida')).toBeInTheDocument();
  });

  it('resets back to the default active status filter', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'DISABLED');
    await user.click(screen.getByRole('button', { name: /limpar/i }));

    expect(usePermissionsCatalogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      0,
      20,
    );
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('ACTIVE');
  });

  it('keeps the create CTA enabled when create capability is available', () => {
    renderPage();

    const createButton = screen.getByRole('button', { name: /cadastrar permissão/i });
    expect(createButton).toBeEnabled();
    expect(screen.queryByText(/cadastro indisponível/i)).not.toBeInTheDocument();
  });

  it('disables the create CTA defensively when the capability matrix blocks creation', () => {
    usePermissionLifecycleCapabilitiesMock.mockReturnValue({
      canCreate: false,
      canDeprecate: true,
      canListLinkedRoles: true,
      canReactivate: true,
      canRemove: true,
    });

    renderPage();

    const createButton = screen.getByRole('button', { name: /cadastrar permissão/i });
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveAccessibleDescription(/cadastro indisponível/i);
  });
});
