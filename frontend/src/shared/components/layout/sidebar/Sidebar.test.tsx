import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionsContext } from '@shared/authz';
import type { PermissionsState } from '@shared/authz';
import { Sidebar } from './Sidebar';

function buildPermissionsState(permissions: string[], isLoading = false): PermissionsState {
  const set = new Set(permissions);
  return {
    permissions: set,
    version: 1,
    isLoading,
    error: null,
    can: (permission: string) => set.has(permission),
    hasAny: (perms: string[]) => perms.some((p) => set.has(p)),
    hasAll: (perms: string[]) => perms.every((p) => set.has(p)),
    reload: () => undefined,
  };
}

function renderSidebar(node: ReactNode, permissions: string[], isLoading = false) {
  return render(
    <PermissionsContext.Provider value={buildPermissionsState(permissions, isLoading)}>
      <MemoryRouter>{node}</MemoryRouter>
    </PermissionsContext.Provider>,
  );
}

describe('Sidebar', () => {
  it('hides every navigation group while permissions are loading', () => {
    renderSidebar(<Sidebar isOpen />, [], true);
    expect(screen.queryByText('Cadastro')).not.toBeInTheDocument();
    expect(screen.queryByText('Distribuição')).not.toBeInTheDocument();
    expect(screen.queryByText('Autorização')).not.toBeInTheDocument();
  });

  it('hides Distribuição group when the user lacks rubrica and processo permissions', () => {
    renderSidebar(<Sidebar isOpen />, ['cadastro:default:associacao:listar']);
    expect(screen.getByText('Cadastro')).toBeInTheDocument();
    expect(screen.queryByText('Distribuição')).not.toBeInTheDocument();
  });

  it('shows Distribuição → Rubricas only when the user has rubrica:listar', () => {
    renderSidebar(<Sidebar isOpen />, ['distribuicao:default:rubrica:listar']);
    expect(screen.getByText('Distribuição')).toBeInTheDocument();
    expect(screen.getByText('Rubricas')).toBeInTheDocument();
    expect(screen.queryByText('Processos')).not.toBeInTheDocument();
  });

  it('shows Distribuição → Processos only when the user has processo:listar', () => {
    renderSidebar(<Sidebar isOpen />, ['distribuicao:default:processo:listar']);
    expect(screen.getByText('Distribuição')).toBeInTheDocument();
    expect(screen.getByText('Processos')).toBeInTheDocument();
    expect(screen.queryByText('Rubricas')).not.toBeInTheDocument();
  });

  it('shows Autorização group for any authz:admin:*:visualizar permission', () => {
    renderSidebar(<Sidebar isOpen />, ['authz:admin:role:visualizar']);
    expect(screen.getByText('Autorização')).toBeInTheDocument();
    expect(screen.getByText('Papéis & Acessos')).toBeInTheDocument();
  });

  it('shows Auditoria only for official auditoria permissions', () => {
    renderSidebar(<Sidebar isOpen />, ['cadastro:default:status:visualizar-historico-obra']);
    expect(screen.queryByText('Auditoria')).not.toBeInTheDocument();

    renderSidebar(<Sidebar isOpen />, ['auditoria:default:evento:listar']);
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
    expect(screen.getByText('Histórico de alterações')).toBeInTheDocument();
  });
});
