import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequirePermission } from '../RequirePermission';
import type { PermissionsState } from '@shared/authz/types';

const usePermissionsMock = vi.hoisted(() => vi.fn());

vi.mock('@shared/authz', () => ({
  usePermissions: usePermissionsMock,
}));

vi.mock('@shared/authz/usePermissions', () => ({
  usePermissions: usePermissionsMock,
}));

function permissionsState(overrides: Partial<PermissionsState> = {}): PermissionsState {
  const permissions = overrides.permissions ?? new Set<string>();

  return {
    permissions,
    version: overrides.version ?? 1,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    can: (permission) => permissions.has(permission),
    hasAny: (perms) => perms.some((p) => permissions.has(p)),
    hasAll: (perms) => perms.every((p) => permissions.has(p)),
    reload: overrides.reload ?? vi.fn(),
  };
}

function renderWithRouter(ui: React.ReactNode, initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<span>home</span>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequirePermission', () => {
  afterEach(() => {
    usePermissionsMock.mockReset();
  });

  it('renders children when the required permission is present', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:criar']) }),
    );

    renderWithRouter(
      <RequirePermission permission="cadastro:default:obra:criar">
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('renders the access-denied fallback by default when the required permission is missing', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    renderWithRouter(
      <RequirePermission permission="cadastro:default:obra:criar">
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    // Default fallback no longer navigates to "/" because doing so could
    // create a redirect loop with HomeRedirect when the user lacks the
    // permissions needed by the default landing page.
    expect(screen.queryByText('home')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Você não tem permissão para acessar esta área/i),
    ).toBeInTheDocument();
  });

  it('renders custom fallback when the required permission is missing', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    renderWithRouter(
      <RequirePermission
        permission="cadastro:default:obra:criar"
        fallback={<span>sem acesso</span>}
      >
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    expect(screen.getByText('sem acesso')).toBeInTheDocument();
  });

  it('respects anyOf — renders children when at least one matches', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:editar']) }),
    );

    renderWithRouter(
      <RequirePermission anyOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}>
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('respects anyOf — denies when none of the permissions are present', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    renderWithRouter(
      <RequirePermission
        anyOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}
        fallback={<span>bloqueado</span>}
      >
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });

  it('respects allOf — renders children when every permission is present', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({
        permissions: new Set(['cadastro:default:obra:criar', 'cadastro:default:obra:editar']),
      }),
    );

    renderWithRouter(
      <RequirePermission allOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}>
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('respects allOf — denies when any permission is missing', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:criar']) }),
    );

    renderWithRouter(
      <RequirePermission
        allOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}
        fallback={<span>bloqueado</span>}
      >
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });

  it('renders null while permissions are loading (no flash)', () => {
    usePermissionsMock.mockReturnValue(permissionsState({ isLoading: true }));

    const { container } = renderWithRouter(
      <RequirePermission permission="cadastro:default:obra:criar">
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(container.querySelector('span')).toBeNull();
  });

  it('denies access when no rule is provided', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:criar']) }),
    );

    renderWithRouter(
      <RequirePermission fallback={<span>bloqueado</span>}>
        <span>conteúdo</span>
      </RequirePermission>,
    );

    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });
});
