import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Can } from '../Can';
import type { PermissionsState } from '../types';

const usePermissionsMock = vi.hoisted(() => vi.fn());

vi.mock('../usePermissions', () => ({
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

describe('Can', () => {
  afterEach(() => {
    usePermissionsMock.mockReset();
  });

  it('renders children when the required permission is present', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:criar']) }),
    );

    render(
      <Can permission="cadastro:default:obra:criar">
        <span>nova obra</span>
      </Can>,
    );

    expect(screen.getByText('nova obra')).toBeInTheDocument();
  });

  it('renders the fallback when the required permission is missing', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    render(
      <Can permission="cadastro:default:obra:criar" fallback={<span>sem acesso</span>}>
        <span>nova obra</span>
      </Can>,
    );

    expect(screen.queryByText('nova obra')).not.toBeInTheDocument();
    expect(screen.getByText('sem acesso')).toBeInTheDocument();
  });

  it('renders null fallback by default when permission is missing', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    const { container } = render(
      <Can permission="cadastro:default:obra:criar">
        <span>nova obra</span>
      </Can>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('respects anyOf — renders children when at least one matches', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:editar']) }),
    );

    render(
      <Can anyOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}>
        <span>panel</span>
      </Can>,
    );

    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('respects anyOf — renders fallback when none match', () => {
    usePermissionsMock.mockReturnValue(permissionsState());

    render(
      <Can
        anyOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}
        fallback={<span>bloqueado</span>}
      >
        <span>panel</span>
      </Can>,
    );

    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });

  it('respects allOf — renders children when every permission is present', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({
        permissions: new Set(['cadastro:default:obra:criar', 'cadastro:default:obra:editar']),
      }),
    );

    render(
      <Can allOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}>
        <span>panel</span>
      </Can>,
    );

    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('respects allOf — renders fallback when any permission is missing', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ permissions: new Set(['cadastro:default:obra:criar']) }),
    );

    render(
      <Can
        allOf={['cadastro:default:obra:criar', 'cadastro:default:obra:editar']}
        fallback={<span>bloqueado</span>}
      >
        <span>panel</span>
      </Can>,
    );

    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });

  it('renders the loading slot while permissions are still loading', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ isLoading: true }),
    );

    render(
      <Can permission="cadastro:default:obra:criar" loading={<span>carregando</span>}>
        <span>nova obra</span>
      </Can>,
    );

    expect(screen.getByText('carregando')).toBeInTheDocument();
    expect(screen.queryByText('nova obra')).not.toBeInTheDocument();
  });

  it('renders null by default while loading with no cached permissions', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({ isLoading: true }),
    );

    const { container } = render(
      <Can permission="cadastro:default:obra:criar">
        <span>nova obra</span>
      </Can>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('keeps evaluating against cached permissions while refetching', () => {
    usePermissionsMock.mockReturnValue(
      permissionsState({
        isLoading: true,
        permissions: new Set(['cadastro:default:obra:criar']),
      }),
    );

    render(
      <Can permission="cadastro:default:obra:criar">
        <span>nova obra</span>
      </Can>,
    );

    expect(screen.getByText('nova obra')).toBeInTheDocument();
  });
});
