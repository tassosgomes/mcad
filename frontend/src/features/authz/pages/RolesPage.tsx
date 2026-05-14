import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { Pagination } from '@components/ui/pagination';
import { RoleDetailPanel } from '../components/RoleDetailPanel';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import { useAddPermissionToRole, useCreateRole, useRolesCatalog } from '../hooks/useRolesCatalog';
import type { PermissionFilters, PermissionSummary } from '../types/permission';
import type { RoleCreateRequest, RoleFilters, RoleStatus, RoleSummary } from '../types/role';
import styles from './RolesPage.module.css';

const PAGE_SIZE = 20;
const PERMISSION_PAGE_SIZE = 100;

type PanelMode = 'create' | 'edit';

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

interface RoleFormState {
  domain: string;
  area: string;
  slug: string;
  displayName: string;
  description: string;
}

const emptyForm: RoleFormState = {
  domain: 'cadastro',
  area: '',
  slug: '',
  displayName: '',
  description: '',
};

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildRoleKey(form: RoleFormState): string {
  const domain = normalizeSegment(form.domain);
  const area = normalizeSegment(form.area);
  const slug = normalizeSegment(form.slug);
  return [domain, area, slug].filter(Boolean).join('.');
}

function getStatusLabel(status: RoleStatus): string {
  return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
}

function StatusBadge({ status }: { status: RoleStatus }) {
  return (
    <span className={`${styles.status} ${status === 'ACTIVE' ? styles.active : styles.inactive}`}>
      {getStatusLabel(status)}
    </span>
  );
}

interface RoleRowProps {
  role: RoleSummary;
  selected: boolean;
  onSelect: (roleId: string) => void;
}

function RoleRow({ role, selected, onSelect }: RoleRowProps) {
  return (
    <tr
      className={`${styles.row} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect(role.id)}
    >
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
        <StatusBadge status={role.status} />
      </td>
      <td className={styles.td}>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(role.id);
            }}
          >
            <Pencil size={14} />
            Editar
          </Button>
        </div>
      </td>
    </tr>
  );
}

function toCreatePayload(form: RoleFormState): RoleCreateRequest {
  const domain = normalizeSegment(form.domain);
  const area = normalizeSegment(form.area);

  return {
    key: buildRoleKey(form),
    domain,
    area: area || null,
    displayName: form.displayName.trim(),
    description: form.description.trim() || null,
  };
}

function PermissionOption({
  permission,
  checked,
  disabled,
  onToggle,
}: {
  permission: PermissionSummary;
  checked: boolean;
  disabled: boolean;
  onToggle: (permissionKey: string) => void;
}) {
  return (
    <label className={styles.permissionItem}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(permission.key)}
      />
      <span>
        <span className={styles.primaryText}>{permission.displayName}</span>
        <span className={`${styles.secondaryText} ${styles.mono}`}>{permission.key}</span>
      </span>
    </label>
  );
}

export function RolesPage() {
  const [filters, setFilters] = useState<RoleFilters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] = useState<RoleFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('create');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const rolesQuery = useRolesCatalog(submittedFilters, page, PAGE_SIZE);
  const createRoleMutation = useCreateRole();
  const addPermissionMutation = useAddPermissionToRole();
  const roleKey = buildRoleKey(form);

  const permissionFilters: PermissionFilters = {
    domain: normalizeSegment(form.domain),
    area: '',
    service: '',
    status: 'ACTIVE',
    q: permissionSearch,
  };
  const permissionsQuery = usePermissionsCatalog(permissionFilters, 0, PERMISSION_PAGE_SIZE);

  const roles = rolesQuery.data?.content ?? [];
  const activeRolesCount = useMemo(
    () => roles.filter((role) => role.status === 'ACTIVE').length,
    [roles],
  );
  const submitting = createRoleMutation.isPending || addPermissionMutation.isPending;

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSelectedRoleId(null);
    setPanelMode('create');
    setFeedback(null);
    setSubmittedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(emptyFilters);
    setSubmittedFilters(emptyFilters);
    setPage(0);
    setSelectedRoleId(null);
    setPanelMode('create');
    setFeedback(null);
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setPanelMode('edit');
    setFeedback(null);
  };

  const handleCreateNew = () => {
    setSelectedRoleId(null);
    setPanelMode('create');
    setFeedback(null);
  };

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissionKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey],
    );
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!normalizeSegment(form.domain) || !normalizeSegment(form.area) || !normalizeSegment(form.slug)) {
      setFeedback({
        tone: 'error',
        message: 'Informe domínio, área e identificador para gerar a chave do papel.',
      });
      return;
    }

    if (!form.displayName.trim()) {
      setFeedback({ tone: 'error', message: 'Informe o nome de exibição do papel.' });
      return;
    }

    try {
      const createdRole = await createRoleMutation.mutateAsync(toCreatePayload(form));
      for (const permissionKey of selectedPermissionKeys) {
        await addPermissionMutation.mutateAsync({ roleId: createdRole.id, permissionKey });
      }

      setFeedback({
        tone: 'success',
        message:
          selectedPermissionKeys.length > 0
            ? 'Papel criado com as permissões selecionadas.'
            : 'Papel criado sem permissões iniciais.',
      });
      setForm(emptyForm);
      setPermissionSearch('');
      setSelectedPermissionKeys([]);
      setSelectedRoleId(createdRole.id);
      setPanelMode('edit');
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Não foi possível criar o papel no serviço de autorização.',
      });
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Papéis"
        description="Cadastro de papéis e composição inicial com permissões do catálogo AuthZ."
        action={(
          <Button
            variant="secondary"
            type="button"
            onClick={() => rolesQuery.refetch()}
            disabled={rolesQuery.isFetching}
          >
            <RefreshCw size={16} />
            Atualizar
          </Button>
        )}
      />

      <form className={styles.filters} onSubmit={handleFilterSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-query">Busca</label>
          <input
            id="role-query"
            className={styles.input}
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder="Chave ou nome"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-domain">Domínio</label>
          <input
            id="role-domain"
            className={`${styles.input} ${styles.mono}`}
            value={filters.domain}
            onChange={(event) => setFilters((prev) => ({ ...prev, domain: event.target.value }))}
            placeholder="cadastro"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-area">Área</label>
          <input
            id="role-area"
            className={`${styles.input} ${styles.mono}`}
            value={filters.area}
            onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))}
            placeholder="gestao"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="role-status">Status</label>
          <select
            id="role-status"
            className={styles.select}
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({
              ...prev,
              status: event.target.value as RoleFilters['status'],
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

      {rolesQuery.isError && (
        <div className={styles.error}>Não foi possível consultar os papéis no ecad-authz.</div>
      )}

      <div className={styles.workspace}>
        <section className={styles.tablePanel} aria-label="Papéis cadastrados">
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
                      <th className={styles.th}>Status</th>
                      <th className={styles.th} aria-label="Ações">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <RoleRow
                        key={role.id}
                        role={role}
                        selected={panelMode === 'edit' && selectedRoleId === role.id}
                        onSelect={handleSelectRole}
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
                onPageChange={(nextPage) => {
                  setPage(Math.max(nextPage - 1, 0));
                  setSelectedRoleId(null);
                  setPanelMode('create');
                  setFeedback(null);
                }}
              />
              <div className={styles.empty}>
                {rolesQuery.data.totalElements} papéis filtrados, {activeRolesCount} ativos nesta página.
              </div>
            </>
          )}
        </section>

        {panelMode === 'create' ? (
          <aside className={styles.createPanel}>
            <div>
              <h2 className={styles.panelTitle}>Novo papel</h2>
              <p className={styles.panelDescription}>
                Crie o papel e selecione as permissões iniciais que serão vinculadas a ele.
              </p>
            </div>

            {feedback && (
              <div className={feedback.tone === 'success' ? styles.success : styles.error}>
                {feedback.message}
              </div>
            )}

            <form className={styles.form} onSubmit={handleCreateRole}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="new-role-domain">Domínio</label>
                  <input
                    id="new-role-domain"
                    className={`${styles.input} ${styles.mono}`}
                    value={form.domain}
                    onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
                    placeholder="cadastro"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="new-role-area">Área</label>
                  <input
                    id="new-role-area"
                    className={`${styles.input} ${styles.mono}`}
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    placeholder="gestao"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="new-role-slug">Identificador</label>
                  <input
                    id="new-role-slug"
                    className={`${styles.input} ${styles.mono}`}
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="analista"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="new-role-name">Nome</label>
                  <input
                    id="new-role-name"
                    className={styles.input}
                    value={form.displayName}
                    onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                    placeholder="Analista de Cadastro"
                  />
                </div>
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label} htmlFor="new-role-description">Descrição</label>
                  <textarea
                    id="new-role-description"
                    className={styles.textarea}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Responsabilidades e escopo operacional do papel"
                  />
                </div>
              </div>

              <div className={styles.keyPreview}>
                <span className={styles.label}>Chave gerada</span>
                <span className={`${styles.primaryText} ${styles.mono}`}>{roleKey || '-'}</span>
              </div>

              <div className={styles.permissionPicker}>
                <div className={styles.pickerHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>Permissões iniciais</h3>
                    <p className={styles.panelDescription}>
                      A busca considera permissões ativas do domínio informado no papel.
                    </p>
                  </div>
                  <span className={styles.counter}>{selectedPermissionKeys.length} selecionadas</span>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="permission-search">Buscar permissão</label>
                  <input
                    id="permission-search"
                    className={styles.input}
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
                    placeholder="Nome, chave ou descrição"
                  />
                </div>

                {permissionsQuery.isLoading && <Loading />}
                {permissionsQuery.isError && (
                  <div className={styles.error}>Não foi possível consultar as permissões disponíveis.</div>
                )}
                {permissionsQuery.data && permissionsQuery.data.content.length === 0 && (
                  <div className={styles.empty}>Nenhuma permissão ativa encontrada para esse domínio.</div>
                )}
                {permissionsQuery.data && permissionsQuery.data.content.length > 0 && (
                  <div className={styles.permissionList}>
                    {permissionsQuery.data.content.map((permission) => (
                      <PermissionOption
                        key={permission.id}
                        permission={permission}
                        checked={selectedPermissionKeys.includes(permission.key)}
                        disabled={submitting}
                        onToggle={togglePermission}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <Button type="submit" disabled={submitting}>
                  <Plus size={16} />
                  Cadastrar papel
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setForm(emptyForm);
                    setPermissionSearch('');
                    setSelectedPermissionKeys([]);
                    setFeedback(null);
                  }}
                >
                  <ShieldCheck size={16} />
                  Limpar
                </Button>
              </div>
            </form>
          </aside>
        ) : (
          <RoleDetailPanel roleId={selectedRoleId} onCreateNew={handleCreateNew} />
        )}
      </div>

      <Button variant="ghost" type="button" onClick={handleResetFilters}>
        <ShieldCheck size={16} />
        Limpar filtros
      </Button>
    </div>
  );
}
