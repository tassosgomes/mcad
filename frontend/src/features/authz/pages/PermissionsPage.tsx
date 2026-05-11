import { useEffect, useMemo, useState } from 'react';
import { Archive, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { runtimeConfig } from '@shared/config/runtimeConfig';
import {
  useDeprecatePermission,
  usePermissionDetails,
  usePermissionsCatalog,
} from '../hooks/usePermissionsCatalog';
import type { Permission, PermissionFilters, PermissionStatus, PermissionSummary } from '../types/permission';
import styles from './PermissionsPage.module.css';

const PAGE_SIZE = 20;

const statusOptions: Array<{ value: '' | PermissionStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'DEPRECATED', label: 'Depreciadas' },
  { value: 'DISABLED', label: 'Desabilitadas' },
];

const emptyFilters: PermissionFilters = {
  domain: '',
  area: '',
  service: '',
  status: '',
  q: '',
};

function getStatusLabel(status: PermissionStatus): string {
  const labels: Record<PermissionStatus, string> = {
    ACTIVE: 'Ativa',
    DEPRECATED: 'Depreciada',
    DISABLED: 'Desabilitada',
  };

  return labels[status];
}

function getStatusClass(status: PermissionStatus): string {
  const classes: Record<PermissionStatus, string> = {
    ACTIVE: styles.active,
    DEPRECATED: styles.deprecated,
    DISABLED: styles.disabled,
  };

  return classes[status];
}

function StatusBadge({ status }: { status: PermissionStatus }) {
  return (
    <span className={`${styles.status} ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value || '-'}</span>
    </div>
  );
}

interface PermissionDetailProps {
  permission: Permission | undefined;
  isLoading: boolean;
  onDeprecate: (permission: Permission) => void;
  isDeprecating: boolean;
}

function PermissionDetail({
  permission,
  isLoading,
  onDeprecate,
  isDeprecating,
}: PermissionDetailProps) {
  if (isLoading) {
    return (
      <aside className={styles.detailPanel}>
        <Loading />
      </aside>
    );
  }

  if (!permission) {
    return (
      <aside className={styles.detailPanel}>
        <h2 className={styles.detailTitle}>Selecione uma permissão</h2>
        <p className={styles.detailDescription}>
          Escolha uma linha do catálogo para consultar metadados, origem e status.
        </p>
      </aside>
    );
  }

  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailTitle}>{permission.displayName}</h2>
          <p className={`${styles.detailDescription} ${styles.mono}`}>{permission.key}</p>
        </div>
        <StatusBadge status={permission.status} />
      </div>

      <p className={styles.detailDescription}>{permission.description || 'Sem descrição registrada.'}</p>

      <div className={styles.detailList}>
        <DetailItem label="Domínio" value={permission.domain} mono />
        <DetailItem label="Área" value={permission.area} mono />
        <DetailItem label="Recurso" value={permission.resource} mono />
        <DetailItem label="Ação" value={permission.action} mono />
        <DetailItem label="Serviço declarante" value={permission.serviceName} mono />
        <DetailItem label="Criada em" value={new Date(permission.createdAt).toLocaleString('pt-BR')} />
        <DetailItem label="Atualizada em" value={new Date(permission.updatedAt).toLocaleString('pt-BR')} />
      </div>

      <Button
        variant="danger"
        type="button"
        disabled={permission.status === 'DEPRECATED' || isDeprecating}
        onClick={() => onDeprecate(permission)}
      >
        <Archive size={16} />
        Depreciar permissão
      </Button>
    </aside>
  );
}

export function PermissionsPage() {
  const [filters, setFilters] = useState<PermissionFilters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] = useState<PermissionFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [selectedPermissionId, setSelectedPermissionId] = useState<string | null>(null);

  const permissionsQuery = usePermissionsCatalog(submittedFilters, page, PAGE_SIZE);
  const detailsQuery = usePermissionDetails(selectedPermissionId);
  const deprecateMutation = useDeprecatePermission();

  const permissions = permissionsQuery.data?.content ?? [];
  const activeCount = useMemo(
    () => permissions.filter((permission) => permission.status === 'ACTIVE').length,
    [permissions],
  );
  const deprecatedCount = useMemo(
    () => permissions.filter((permission) => permission.status === 'DEPRECATED').length,
    [permissions],
  );

  useEffect(() => {
    if (!selectedPermissionId && permissions.length > 0) {
      setSelectedPermissionId(permissions[0].id);
    }
  }, [permissions, selectedPermissionId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSelectedPermissionId(null);
    setSubmittedFilters(filters);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setSubmittedFilters(emptyFilters);
    setPage(0);
    setSelectedPermissionId(null);
  };

  const handleDeprecate = (permission: Permission) => {
    const confirmed = window.confirm(`Depreciar a permissão "${permission.key}"?`);
    if (!confirmed) {
      return;
    }

    deprecateMutation.mutate(permission.id);
  };

  const renderRow = (permission: PermissionSummary) => {
    const selected = selectedPermissionId === permission.id;

    return (
      <tr
        key={permission.id}
        className={`${styles.row} ${selected ? styles.selected : ''}`}
        onClick={() => setSelectedPermissionId(permission.id)}
      >
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
          <StatusBadge status={permission.status} />
        </td>
        <td className={styles.td}>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedPermissionId(permission.id);
              }}
            >
              Ver
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Permissões"
        description="Catálogo técnico de autorização fina consumido pelas APIs do MCAD."
        action={(
          <Button
            variant="secondary"
            type="button"
            onClick={() => permissionsQuery.refetch()}
            disabled={permissionsQuery.isFetching}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        )}
      />

      <form className={styles.filters} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-query">Busca</label>
          <input
            id="permission-query"
            className={styles.input}
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Chave, nome ou descrição"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-domain">Domínio</label>
          <input
            id="permission-domain"
            className={`${styles.input} ${styles.mono}`}
            value={filters.domain}
            onChange={(event) => setFilters((prev) => ({ ...prev, domain: event.target.value }))}
            placeholder="cadastro"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-area">Área</label>
          <input
            id="permission-area"
            className={`${styles.input} ${styles.mono}`}
            value={filters.area}
            onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))}
            placeholder="gestao"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-service">Serviço</label>
          <input
            id="permission-service"
            className={`${styles.input} ${styles.mono}`}
            value={filters.service}
            onChange={(event) => setFilters((prev) => ({ ...prev, service: event.target.value }))}
            placeholder="cadastro-api"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="permission-status">Status</label>
          <select
            id="permission-status"
            className={styles.select}
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({
              ...prev,
              status: event.target.value as PermissionFilters['status'],
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
      </form>

      <div className={styles.summaryGrid}>
        <Metric label="Endpoint" value={runtimeConfig.authzApiBaseUrl.replace(/^https?:\/\//, '')} />
        <Metric label="Total filtrado" value={permissionsQuery.data?.totalElements ?? 0} />
        <Metric label="Ativas na página" value={activeCount} />
        <Metric label="Depreciadas na página" value={deprecatedCount} />
      </div>

      {permissionsQuery.isError && (
        <div className={styles.error}>
          Não foi possível consultar o catálogo de permissões no ecad-authz.
        </div>
      )}

      <div className={styles.workspace}>
        <section className={styles.tablePanel} aria-label="Catálogo de permissões">
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
                      <th className={styles.th} aria-label="Ações">Ações</th>
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
                  setSelectedPermissionId(null);
                }}
              />
            </>
          )}
        </section>

        <PermissionDetail
          permission={detailsQuery.data}
          isLoading={detailsQuery.isLoading}
          onDeprecate={handleDeprecate}
          isDeprecating={deprecateMutation.isPending}
        />
      </div>

      <Button variant="ghost" type="button" onClick={handleReset}>
        <ShieldCheck size={16} />
        Limpar filtros
      </Button>
    </div>
  );
}
