import { useState } from 'react';
import { ChevronRight, Plus, RefreshCw, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { PermissionStatusBadge } from '../components/PermissionStatusBadge';
import { PERMISSION_STATUS_FILTER_OPTIONS } from '../contract/authzPermissionLifecycleContract';
import { usePermissionLifecycleCapabilities } from '../hooks/usePermissionLifecycle';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import type { PermissionFilters, PermissionSummary } from '../types/permission';
import styles from './PermissionsPage.module.css';

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: PermissionFilters = {
  domain: '',
  area: '',
  service: '',
  status: 'ACTIVE',
  q: '',
};

const STATUS_FILTER_OPTIONS = PERMISSION_STATUS_FILTER_OPTIONS.filter((option) => option.value !== '');

export function PermissionsPage() {
  const navigate = useNavigate();
  const capabilities = usePermissionLifecycleCapabilities();
  const [filters, setFilters] = useState<PermissionFilters>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<PermissionFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const permissionsQuery = usePermissionsCatalog(submittedFilters, page, PAGE_SIZE);

  const permissions = permissionsQuery.data?.content ?? [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSubmittedFilters(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSubmittedFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  const renderRow = (permission: PermissionSummary) => (
    <tr key={permission.id} className={styles.row}>
      <td className={styles.td}>
        <span className={styles.primaryText}>{permission.displayName}</span>
        <span className={`${styles.secondaryText} ${styles.mono}`}>{permission.key}</span>
      </td>
      <td className={styles.td}>
        <span className={styles.chip}>{permission.domain || '-'}</span>
      </td>
      <td className={styles.td}>
        <span className={styles.chip}>{permission.area || '-'}</span>
      </td>
      <td className={styles.td}>
        <PermissionStatusBadge status={permission.status} />
      </td>
      <td className={`${styles.td} ${styles.actionCell}`}>
        <button
          type="button"
          className={styles.openButton}
          onClick={() => navigate(`/autorizacao/permissoes/${permission.id}`)}
          aria-label={`Ver detalhes de ${permission.displayName}`}
        >
          Detalhes
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Permissões"
        description="Catálogo técnico de autorização fina consumido pelas APIs do MCAD."
        action={(
          <>
            <div className={styles.createAction}>
              <Button
                type="button"
                onClick={() => navigate('/autorizacao/permissoes/nova')}
                disabled={!capabilities.canCreate}
                aria-describedby={!capabilities.canCreate ? 'permission-create-unavailable' : undefined}
              >
                <Plus size={16} />
                Cadastrar permissão
              </Button>
              {!capabilities.canCreate && (
                <span id="permission-create-unavailable" className={styles.actionHint}>
                  Cadastro indisponível até o ecad-authz expor o endpoint administrativo.
                </span>
              )}
            </div>
            <Button variant="ghost" type="button" onClick={() => navigate('/autorizacao/papeis')}>
              <ShieldCheck size={16} />
              Gerenciar papéis
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => permissionsQuery.refetch()}
              disabled={permissionsQuery.isFetching}
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
          </>
        )}
      />

      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-query">Busca</label>
          <input
            id="permission-query"
            className={styles.input}
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Chave, nome ou descrição"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-domain">Domínio</label>
          <input
            id="permission-domain"
            className={`${styles.input} ${styles.mono}`}
            value={filters.domain}
            onChange={(e) => setFilters((prev) => ({ ...prev, domain: e.target.value }))}
            placeholder="cadastro"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-area">Área</label>
          <input
            id="permission-area"
            className={`${styles.input} ${styles.mono}`}
            value={filters.area}
            onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value }))}
            placeholder="gestao"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-service">Serviço</label>
          <input
            id="permission-service"
            className={`${styles.input} ${styles.mono}`}
            value={filters.service}
            onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))}
            placeholder="cadastro-api"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-status">Status</label>
          <select
            id="permission-status"
            className={styles.select}
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({
              ...prev,
              status: e.target.value as PermissionFilters['status'],
            }))}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className={styles.fieldHint}>
            A listagem abre em Ativas. Selecione Removidas para consultar permissões removidas.
          </span>
        </div>
        <Button type="submit">
          <Search size={16} />
          Filtrar
        </Button>
        <Button variant="ghost" type="button" onClick={handleReset}>
          <RotateCcw size={16} />
          Limpar
        </Button>
      </form>

      {permissionsQuery.isError && (
        <div className={styles.error}>
          Não foi possível consultar o catálogo de permissões no ecad-authz.
        </div>
      )}

      <section aria-label="Catálogo de permissões">
        {permissionsQuery.isLoading && <Loading />}

        {permissionsQuery.data && permissions.length === 0 && (
          <div className={styles.empty}>Nenhuma permissão encontrada para os filtros aplicados.</div>
        )}

        {permissionsQuery.data && permissions.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Permissão</th>
                    <th className={styles.th}>Domínio</th>
                    <th className={styles.th}>Área</th>
                    <th className={styles.th}>Status</th>
                    <th className={`${styles.th} ${styles.actionCell}`}>
                      <span className={styles.srOnly}>Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>{permissions.map(renderRow)}</tbody>
              </table>
            </div>
            <Pagination
              pagination={{
                page: (permissionsQuery.data.page ?? page) + 1,
                size: permissionsQuery.data.size,
                total: permissionsQuery.data.totalElements,
                totalPages: Math.max(permissionsQuery.data.totalPages, 1),
              }}
              onPageChange={(nextPage) => {
                setPage(Math.max(nextPage - 1, 0));
              }}
            />
            <p className={styles.meta}>
              {permissionsQuery.data.totalElements} {permissionsQuery.data.totalElements === 1 ? 'permissão' : 'permissões'} no filtro atual.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
