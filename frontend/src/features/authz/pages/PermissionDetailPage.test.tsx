import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Permission, PermissionRemovalEligibility } from '../types/permission';
import {
  useDeprecatePermissionGoverned,
  usePermissionLinkedRoles,
  usePermissionOperationAvailable,
} from '../hooks/usePermissionLifecycle';
import { usePermissionDetails } from '../hooks/usePermissionsCatalog';
import { PermissionDetailPage } from './PermissionDetailPage';

vi.mock('../hooks/usePermissionsCatalog', () => ({
  usePermissionDetails: vi.fn(),
}));

vi.mock('../hooks/usePermissionLifecycle', () => ({
  useDeprecatePermissionGoverned: vi.fn(),
  usePermissionLinkedRoles: vi.fn(),
  usePermissionOperationAvailable: vi.fn(),
}));

vi.mock('@components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const usePermissionDetailsMock = vi.mocked(usePermissionDetails);
const useDeprecatePermissionGovernedMock = vi.mocked(useDeprecatePermissionGoverned);
const usePermissionLinkedRolesMock = vi.mocked(usePermissionLinkedRoles);
const usePermissionOperationAvailableMock = vi.mocked(usePermissionOperationAvailable);

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

function createEligibility(
  overrides: Partial<PermissionRemovalEligibility> = {},
): PermissionRemovalEligibility {
  return {
    permissionId: 'perm-1',
    permissionStatus: 'DEPRECATED',
    linkedRoles: [],
    canRemove: true,
    ...overrides,
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
    usePermissionLinkedRolesMock.mockReturnValue({
      data: createEligibility(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionLinkedRoles>);
    usePermissionOperationAvailableMock.mockImplementation((operation) => (
      operation === 'deprecate' || operation === 'listLinkedRoles'
    ));
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

  it('renders linked roles with key, display name and status', () => {
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('DEPRECATED'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);
    usePermissionLinkedRolesMock.mockReturnValue({
      data: createEligibility({
        linkedRoles: [
          {
            id: 'role-1',
            key: 'cadastro.obras.analista',
            displayName: 'Analista de Obras',
            status: 'ACTIVE',
          },
        ],
        canRemove: false,
        blockingReason: 'ROLE_LINKS_PRESENT',
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionLinkedRoles>);

    renderPage();

    expect(screen.getByRole('heading', { name: /papéis vinculados/i })).toBeInTheDocument();
    expect(screen.getByText('Analista de Obras')).toBeInTheDocument();
    expect(screen.getByText('cadastro.obras.analista')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText(/com vínculos ativos/i)).toBeInTheDocument();
  });

  it('renders empty linked roles and removal eligibility guidance', () => {
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('DEPRECATED'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);

    renderPage();

    expect(screen.getByText(/nenhum papel vinculado/i)).toBeInTheDocument();
    expect(screen.getByText(/sem vínculos com papéis/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmação literal/i)).toBeInTheDocument();
  });

  it('explains when the current status is not eligible for removal', () => {
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('ACTIVE'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);
    usePermissionLinkedRolesMock.mockReturnValue({
      data: createEligibility({
        permissionStatus: 'ACTIVE',
        canRemove: false,
        blockingReason: 'STATUS_NOT_DEPRECATED',
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionLinkedRoles>);

    renderPage();

    expect(screen.getByText(/status ainda não elegível/i)).toBeInTheDocument();
    expect(screen.getByText(/precisa estar depreciada/i)).toBeInTheDocument();
  });

  it('shows create, reactivate and remove unavailable by external dependency', () => {
    usePermissionDetailsMock.mockReturnValue({
      data: createPermission('DEPRECATED'),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermissionDetails>);

    renderPage();

    expect(screen.getByText('Cadastrar permissão')).toBeInTheDocument();
    expect(screen.getByText('Reativar permissão')).toBeInTheDocument();
    expect(screen.getByText('Remover permissão')).toBeInTheDocument();
    expect(screen.getByText(/falta POST \/v1\/permissions no ecad-authz/i)).toBeInTheDocument();
    expect(screen.getByText(/reactivate no ecad-authz/i)).toBeInTheDocument();
    expect(screen.getByText(/remove no ecad-authz/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /indisponível/i })).toHaveLength(3);
  });
});
