import { useMemo, useState } from 'react';
import { Archive, RefreshCw, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ConfirmModal } from '@components/ui/confirm-modal';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { useToast } from '@components/ui/toast';
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

interface PermissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | undefined;
  isLoading: boolean;
  onDeprecate: (permission: Permission) => void;
  isDeprecating: boolean;
}

function PermissionDetailModal({
  isOpen,
  onClose,
  permission,
  isLoading,
  onDeprecate,
  isDeprecating,
}: PermissionDetailModalProps) {
  const title = permission?.displayName ?? 'Detalhes da permissão';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={
        permission ? (
          <>
            <Button variant="ghost" type="button" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={permission.status === 'DEPRECATED' || isDeprecating}
              onClick={() => onDeprecate(permission)}
            >
              <Archive size={16} />
              Depreciar permissão
            </Button>
          </>
        ) : undefined
      }
    >
      {isLoading && <Loading />}

      {!isLoading && !permission && (
        <p>Não foi possível carregar os detalhes desta permissão.</p>
      )}

      {!isLoading && permission && (
        <div className={styles.detailBody}>
          <div className={styles.detailHeader}>
            <p className={`${styles.detailValue} ${styles.mono}`}>{permission.key}</p>
            <StatusBadge status={permission.status} />
          </div>

          {permission.description && (
            <p className={styles.detailDescription}>{permission.description}</p>
          )}

          <div className={styles.detailList}>
            <DetailItem label="Domínio" value={permission.domain} mono />
            <DetailItem label="Área" value={permission.area} mono />
            <DetailItem label="Recurso" value={permission.resource} mono />
            <DetailItem label="Ação" value={permission.action} mono />
            <DetailItem label="Serviço declarante" value={permission.serviceName} mono />
            <DetailItem label="Criada em" value={new Date(permission.createdAt).toLocaleString('pt-BR')} />
            <DetailItem label="Atualizada em" value={new Date(permission.updatedAt).toLocaleString('pt-BR')} />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PermissionsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<PermissionFilters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] = useState<PermissionFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [selectedPermissionId, setSelectedPermissionId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [permissionToDeprecate, setPermissionToDeprecate] = useState<Permission | null>(null);

  const permissionsQuery = usePermissionsCatalog(submittedFilters, page, PAGE_SIZE);
  const detailsQuery = usePermissionDetails(selectedPermissionId);
  const deprecateMutation = useDeprecatePermission();

  const permissions = permissionsQuery.data?.content ?? [];
  const activeCount = useMemo(
    () => permissions.filter((p) => p.status === 'ACTIVE').length,
    [permissions],
  );
  const deprecatedCount = useMemo(
    () => permissions.filter((p) => p.status === 'DEPRECATED').length,
    [permissions],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSubmittedFilters(filters);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setSubmittedFilters(emptyFilters);
    setPage(0);
  };

  const openDetail = (permissionId: string) => {
    setSelectedPermissionId(permissionId);
    setDetailModalOpen(true);
  };

  const handleDeprecate = (permission: Permission) => {
    setDetailModalOpen(false);
    setPermissionToDeprecate(permission);
  };

  const handleConfirmDeprecate = () => {
    if (!permissionToDeprecate) return;
    deprecateMutation.mutate(permissionToDeprecate.id, {
      onSuccess: () => {
        showToast('Permissão depreciada.', 'success');
        setPermissionToDeprecate(null);
      },
      onError: () => {
        showToast('Não foi possível depreciar a permissão.', 'error');
        setPermissionToDeprecate(null);
      },
    });
  };

  const renderRow = (permission: PermissionSummary) => (
    <tr
      key={permission.id}
      className={styles.row}
      onClick={() => openDetail(permission.id)}
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
    </tr>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Permissões"
        description="Catálogo técnico de autorização fina consumido pelas APIs do MCAD."
        action={(
          <>
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
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
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

      <div className={styles.summaryGrid}>
        <Metric label="Serviço authz" value={runtimeConfig.authzApiBaseUrl.replace(/^https?:\/\//, '')} />
        <Metric label="Total filtrado" value={permissionsQuery.data?.totalElements ?? 0} />
        <Metric label="Ativas (pág.)" value={activeCount} />
        <Metric label="Depreciadas (pág.)" value={deprecatedCount} />
      </div>

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
          </>
        )}
      </section>

      <PermissionDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        permission={detailsQuery.data}
        isLoading={detailsQuery.isLoading}
        onDeprecate={handleDeprecate}
        isDeprecating={deprecateMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!permissionToDeprecate}
        onClose={() => setPermissionToDeprecate(null)}
        onConfirm={handleConfirmDeprecate}
        title="Depreciar permissão"
        description={`Depreciar a permissão "${permissionToDeprecate?.key}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Depreciar permissão"
        isLoading={deprecateMutation.isPending}
      />
    </div>
  );
}
