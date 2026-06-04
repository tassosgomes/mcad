import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../pages/DashboardPage';
import type { PermissionsState } from '@shared/authz/types';

// Mock hooks
const usePermissionsMock = vi.hoisted(() => vi.fn());
const useEffectiveProfileMock = vi.hoisted(() => vi.fn());

vi.mock('@shared/authz', () => ({
  usePermissions: usePermissionsMock,
}));

vi.mock('@shared/auth/meApi', () => ({
  useEffectiveProfile: useEffectiveProfileMock,
}));

function permissionsState(permissions: string[]): PermissionsState {
  const permSet = new Set(permissions);
  return {
    permissions: permSet,
    version: 1,
    isLoading: false,
    error: null,
    can: (p) => permSet.has(p),
    hasAny: (perms) => perms.some((p) => permSet.has(p)),
    hasAll: (perms) => perms.every((p) => permSet.has(p)),
    reload: vi.fn(),
  };
}

describe('DashboardPage', () => {
  afterEach(() => {
    usePermissionsMock.mockReset();
    useEffectiveProfileMock.mockReset();
  });

  it('renders welcome message with user profile data', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'Maria Silva',
        email: 'maria@mcad.org',
        subjectId: 'user-maria',
        primaryRole: 'Analista de Cadastro',
      },
    });

    usePermissionsMock.mockReturnValue(permissionsState(['cadastro:default:associacao:listar']));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Olá, Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Analista de Cadastro')).toBeInTheDocument();
  });

  it('displays authorized domain widgets normally and unauthorized widgets as restricted', () => {
    useEffectiveProfileMock.mockReturnValue({
      data: {
        name: 'João Mendes',
        primaryRole: 'Analista de Arrecadação',
      },
    });

    // João has access to Arrecadação only, and has no access to Cadastro, Identificação, or Distribuição
    usePermissionsMock.mockReturnValue(
      permissionsState(['arrecadacao:default:cliente:listar']),
    );

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Arrecadação Widget should be fully active and show its action links
    expect(screen.getByText('Licenças')).toBeInTheDocument();
    expect(screen.getByText('Usuários de Música')).toBeInTheDocument();

    // Cadastro, Identificação and Distribuição Widgets should have "Acesso Restrito" overlays
    const restrictedOverlays = screen.getAllByText('Acesso Restrito');
    expect(restrictedOverlays.length).toBe(3);

    // Verify presence of required permission warnings
    expect(screen.getByText('cadastro:default:associacao:listar')).toBeInTheDocument();
    expect(screen.getByText('identificacao:default:captacao:listar')).toBeInTheDocument();
    expect(screen.getByText('distribuicao:default:processo:listar')).toBeInTheDocument();
  });
});
