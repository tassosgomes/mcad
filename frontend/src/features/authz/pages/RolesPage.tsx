import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronRight, Plus, RefreshCw, RotateCcw, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import {
  countAssignmentsPerRole,
  useAssignments,
} from '@features/autorizacao/api/acessosApi';
import { useRolesCatalog } from '../hooks/useRolesCatalog';
import type { RoleFilters, RoleStatus, RoleSummary } from '../types/role';
import styles from './RolesPage.module.css';

const PAGE_SIZE = 20;

const emptyFilters: RoleFilters = {
  domain: '',
  area: '',
  status: '',
  q: '',
};

const statusOptions: Array<{ value: '' | RoleStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

function StatusBadge({ status }: { status: RoleStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'muted'}>
      {status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

interface RoleRowProps {
  role: RoleSummary;
  userCount: number;
  onEdit: (roleId: string) => void;
}

function RoleRow({ role, userCount, onEdit }: RoleRowProps) {
  const usersLabel = userCount === 1 ? 'usuário' : 'usuários';
  return (
    <tr className={styles.row}>
      <td className={styles.td}>
        <span className={styles.primaryText}>{role.displayName}</span>
        <span className={`${styles.secondaryText} ${styles.mono}`}>{role.key}</span>
      </td>
      <td className={styles.td}>
        <span className={styles.chip}>{role.domain}</span>
      </td>
      <td className={styles.td}>
        <span className={styles.chip}>{role.area || '-'}</span>
      </td>
      <td className={styles.td}>
        <span
          className={`${styles.userCountBadge} ${userCount > 0 ? styles.userCountStrong : ''}`}
          aria-label={`${userCount} ${usersLabel} com este papel`}
        >
          <Users size={12} aria-hidden="true" />
          {userCount}
        </span>
      </td>
      <td className={styles.td}>
        <StatusBadge status={role.status} />
      </td>
      <td className={`${styles.td} ${styles.actionCell}`}>
        <button
          type="button"
          className={styles.openButton}
          onClick={() => onEdit(role.id)}
          aria-label={`Abrir papel ${role.displayName}`}
        >
          Abrir
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export function RolesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RoleFilters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] = useState<RoleFilters>(emptyFilters);
  const [page, setPage] = useState(0);

  const rolesQuery = useRolesCatalog(submittedFilters, page, PAGE_SIZE);
  const assignmentsQuery = useAssignments({ page: 0, size: 200 });
  const userCountsByRoleKey = useMemo(
    () => countAssignmentsPerRole(assignmentsQuery.data?.items ?? []),
    [assignmentsQuery.data],
  );

  const roles = rolesQuery.data?.content ?? [];

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSubmittedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(emptyFilters);
    setSubmittedFilters(emptyFilters);
    setPage(0);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Papéis & Acessos"
        description="Gestão de papéis, suas permissões e os usuários atribuídos a cada um."
        action={(
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/autorizacao/papeis/novo')}
            >
              <Plus size={16} />
              Novo papel
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                void rolesQuery.refetch();
                void assignmentsQuery.refetch();
              }}
              disabled={rolesQuery.isFetching || assignmentsQuery.isFetching}
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
          </>
        )}
      />

      <form className={styles.filters} onSubmit={handleFilterSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-query">Busca</label>
          <input
            id="role-query"
            className={styles.input}
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Chave ou nome"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-domain">Domínio</label>
          <input
            id="role-domain"
            className={`${styles.input} ${styles.mono}`}
            value={filters.domain}
            onChange={(e) => setFilters((prev) => ({ ...prev, domain: e.target.value }))}
            placeholder="cadastro"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-area">Área</label>
          <input
            id="role-area"
            className={`${styles.input} ${styles.mono}`}
            value={filters.area}
            onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value }))}
            placeholder="gestao"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-status">Status</label>
          <select
            id="role-status"
            className={styles.select}
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({
              ...prev,
              status: e.target.value as RoleFilters['status'],
            }))}
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit">
          <Search size={16} />
          Filtrar
        </Button>
        <Button variant="ghost" type="button" onClick={handleResetFilters}>
          <RotateCcw size={16} />
          Limpar
        </Button>
      </form>

      {rolesQuery.isError && (
        <div className={styles.error}>Não foi possível consultar os papéis no ecad-authz.</div>
      )}

      <section aria-label="Papéis cadastrados">
        {rolesQuery.isLoading && <Loading />}

        {rolesQuery.data && roles.length === 0 && (
          <div className={styles.empty}>Nenhum papel encontrado para os filtros aplicados.</div>
        )}

        {rolesQuery.data && roles.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Papel</th>
                    <th className={styles.th}>Domínio</th>
                    <th className={styles.th}>Área</th>
                    <th className={styles.th}>Usuários</th>
                    <th className={styles.th}>Status</th>
                    <th className={`${styles.th} ${styles.actionCell}`}>
                      <span className={styles.srOnly}>Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <RoleRow
                      key={role.id}
                      role={role}
                      userCount={userCountsByRoleKey.get(role.key) ?? 0}
                      onEdit={(roleId) => navigate(`/autorizacao/papeis/${roleId}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={{
                page: (rolesQuery.data.page ?? page) + 1,
                size: rolesQuery.data.size,
                total: rolesQuery.data.totalElements,
                totalPages: Math.max(rolesQuery.data.totalPages, 1),
              }}
              onPageChange={(nextPage) => setPage(Math.max(nextPage - 1, 0))}
            />
            <p className={styles.meta}>
              {rolesQuery.data.totalElements} {rolesQuery.data.totalElements === 1 ? 'papel' : 'papéis'} no filtro atual.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
