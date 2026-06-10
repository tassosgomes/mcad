import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, ArrowLeft, MinusCircle, Plus, Save, Search, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { ConfirmModal } from '@components/ui/confirm-modal';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import {
  filterAssignmentsByRole,
  useAssignments,
} from '@features/autorizacao/api/acessosApi';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import {
  useAddPermissionToRole,
  useDeactivateRole,
  useRemovePermissionFromRole,
  useRoleDetails,
  useRolePermissions,
  useUpdateRole,
} from '../hooks/useRolesCatalog';
import { RoleUsersTab } from '../components/RoleUsersTab';
import type { PermissionFilters, PermissionSummary } from '../types/permission';
import styles from './RoleEditPage.module.css';

const PERMISSION_PAGE_SIZE = 100;

type DetailTab = 'users' | 'permissions';

const SCOPED_LIST_PERMISSIONS = [
  'acessos:default:papel:listar',
  'acessos:cadastro:papel:visualizar',
  'acessos:identificacao:papel:visualizar',
  'acessos:arrecadacao:papel:visualizar',
  'acessos:distribuicao:papel:visualizar',
];

function PermissionLine({
  permission,
  action,
  disabled,
  onAction,
}: {
  permission: PermissionSummary;
  action: 'add' | 'remove';
  disabled: boolean;
  onAction: (permission: PermissionSummary) => void;
}) {
  const Icon = action === 'add' ? Plus : MinusCircle;

  return (
    <div className={styles.permissionLine}>
      <div>
        <span className={styles.primaryText}>{permission.displayName}</span>
        <span className={`${styles.secondaryText} ${styles.mono}`}>{permission.key}</span>
      </div>
      <Button
        variant={action === 'add' ? 'secondary' : 'ghost'}
        size="sm"
        type="button"
        disabled={disabled}
        onClick={() => onAction(permission)}
      >
        <Icon size={14} />
        {action === 'add' ? 'Adicionar' : 'Remover'}
      </Button>
    </div>
  );
}

export function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasAny } = usePermissions();
  const canSeeUsers = hasAny(SCOPED_LIST_PERMISSIONS);

  const [form, setForm] = useState({ displayName: '', description: '' });
  const [permissionSearch, setPermissionSearch] = useState('');
  const [tab, setTab] = useState<DetailTab>('users');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [permissionToRemove, setPermissionToRemove] = useState<PermissionSummary | null>(null);

  const roleQuery = useRoleDetails(id ?? null);
  const rolePermissionsQuery = useRolePermissions(id ?? null);
  const updateRoleMutation = useUpdateRole();
  const deactivateRoleMutation = useDeactivateRole();
  const addPermissionMutation = useAddPermissionToRole();
  const removePermissionMutation = useRemovePermissionFromRole();
  const assignmentsQuery = useAssignments({ page: 0, size: 200 });

  const role = roleQuery.data;
  const rolePermissions = rolePermissionsQuery.data ?? [];
  const linkedPermissionIds = useMemo(
    () => new Set(rolePermissions.map((p) => p.id)),
    [rolePermissions],
  );
  const userCount = useMemo(
    () => filterAssignmentsByRole(assignmentsQuery.data?.items ?? [], role?.key).length,
    [assignmentsQuery.data, role?.key],
  );

  const permissionFilters: PermissionFilters = {
    domain: role?.domain ?? '',
    area: '',
    service: '',
    status: 'ACTIVE',
    q: permissionSearch,
  };
  const permissionsQuery = usePermissionsCatalog(
    permissionFilters,
    0,
    PERMISSION_PAGE_SIZE,
    role?.status === 'ACTIVE',
  );
  const availablePermissions = (permissionsQuery.data?.content ?? []).filter(
    (p) => !linkedPermissionIds.has(p.id),
  );

  const isMutating =
    updateRoleMutation.isPending
    || deactivateRoleMutation.isPending
    || addPermissionMutation.isPending
    || removePermissionMutation.isPending;
  const compositionDisabled = isMutating || role?.status === 'INACTIVE';

  useEffect(() => {
    if (role) {
      setForm({ displayName: role.displayName, description: role.description ?? '' });
      setPermissionSearch('');
      setTab(canSeeUsers ? 'users' : 'permissions');
    }
  }, [role?.id, canSeeUsers]);

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.displayName.trim().length < 3) {
      showToast('Informe um nome com pelo menos 3 caracteres.', 'error');
      return;
    }
    try {
      await updateRoleMutation.mutateAsync({
        roleId: role!.id,
        payload: {
          displayName: form.displayName.trim(),
          description: form.description.trim() || null,
        },
      });
      showToast('Papel atualizado.', 'success');
    } catch {
      showToast('Não foi possível atualizar o papel.', 'error');
    }
  };

  const handleConfirmDeactivate = async () => {
    try {
      await deactivateRoleMutation.mutateAsync(role!.id);
      showToast('Papel desativado.', 'success');
      setConfirmDeactivate(false);
    } catch {
      showToast('Não foi possível desativar o papel.', 'error');
      setConfirmDeactivate(false);
    }
  };

  const handleAddPermission = async (permission: PermissionSummary) => {
    try {
      await addPermissionMutation.mutateAsync({ roleId: role!.id, permissionKey: permission.key });
      showToast('Permissão adicionada ao papel.', 'success');
    } catch {
      showToast('Não foi possível adicionar a permissão.', 'error');
    }
  };

  const handleConfirmRemovePermission = async () => {
    if (!permissionToRemove) return;
    try {
      await removePermissionMutation.mutateAsync({ roleId: role!.id, permissionId: permissionToRemove.id });
      showToast('Permissão removida do papel.', 'success');
      setPermissionToRemove(null);
    } catch {
      showToast('Não foi possível remover a permissão.', 'error');
      setPermissionToRemove(null);
    }
  };

  if (roleQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Loading />
      </div>
    );
  }

  if (roleQuery.isError || !role) {
    return (
      <div className={styles.page}>
        <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/autorizacao/papeis')}>
          <ArrowLeft size={16} />
          Papéis & Acessos
        </Button>
        <ErrorState message="Não foi possível carregar o papel." onRetry={() => roleQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/autorizacao/papeis')}
        >
          <ArrowLeft size={16} />
          Papéis & Acessos
        </Button>
        <PageHeader
          title={role.displayName}
          description={<span className={styles.mono}>{role.key}</span>}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.sideCard}>
          <div className={styles.roleInfo}>
            <div className={styles.roleInfoItem}>
              <span className={styles.label}>Status</span>
              <Badge variant={role.status === 'ACTIVE' ? 'success' : 'muted'}>
                {role.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className={styles.roleInfoItem}>
              <span className={styles.label}>Domínio / área</span>
              <span className={`${styles.primaryText} ${styles.mono}`}>
                {role.domain}{role.area ? ` / ${role.area}` : ''}
              </span>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleUpdate}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-role-name">Nome</label>
              <input
                id="edit-role-name"
                className={styles.input}
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                disabled={isMutating}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="edit-role-description">Descrição</label>
              <textarea
                id="edit-role-description"
                className={styles.textarea}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={isMutating}
              />
            </div>
            <div className={styles.actions}>
              <Button type="submit" disabled={isMutating}>
                <Save size={16} />
                Salvar identificação
              </Button>
              <Button
                variant="danger"
                type="button"
                disabled={role.status === 'INACTIVE' || isMutating}
                onClick={() => setConfirmDeactivate(true)}
              >
                <Archive size={16} />
                Desativar
              </Button>
            </div>
            <p className={styles.hint}>
              Salvar grava apenas nome e descrição. Permissões e usuários são aplicados imediatamente.
            </p>
          </form>
        </div>

        <div className={styles.contentCard}>
          <div className={styles.tabs} role="tablist" aria-label="Configuração do papel">
            {canSeeUsers && (
              <button
                type="button"
                role="tab"
                id={`tab-users-${role.id}`}
                aria-selected={tab === 'users'}
                aria-controls={`tabpanel-users-${role.id}`}
                className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`}
                onClick={() => setTab('users')}
              >
                <Users size={14} aria-hidden="true" />
                Usuários
                <span className={styles.tabCount}>{userCount}</span>
              </button>
            )}
            <button
              type="button"
              role="tab"
              id={`tab-permissions-${role.id}`}
              aria-selected={tab === 'permissions'}
              aria-controls={`tabpanel-permissions-${role.id}`}
              className={`${styles.tab} ${tab === 'permissions' ? styles.tabActive : ''}`}
              onClick={() => setTab('permissions')}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              Permissões
              <span className={styles.tabCount}>{rolePermissions.length}</span>
            </button>
          </div>

          {tab === 'users' && canSeeUsers && (
            <div
              role="tabpanel"
              id={`tabpanel-users-${role.id}`}
              aria-labelledby={`tab-users-${role.id}`}
            >
              <RoleUsersTab
                roleKey={role.key}
                roleDisplayName={role.displayName}
                isInactive={role.status === 'INACTIVE'}
              />
            </div>
          )}

          {tab === 'permissions' && (
            <div
              role="tabpanel"
              id={`tabpanel-permissions-${role.id}`}
              aria-labelledby={`tab-permissions-${role.id}`}
            >
              <section className={styles.permissionPicker} aria-label="Permissões do papel">
                <div className={styles.pickerHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Permissões do papel</h3>
                    <p className={styles.cardDescription}>{rolePermissions.length} permissões associadas.</p>
                  </div>
                </div>
                {rolePermissionsQuery.isLoading && <Loading />}
                {rolePermissionsQuery.data && rolePermissions.length === 0 && (
                  <div className={styles.empty}>Nenhuma permissão associada.</div>
                )}
                {rolePermissions.length > 0 && (
                  <div className={styles.permissionList}>
                    {rolePermissions.map((permission) => (
                      <PermissionLine
                        key={permission.id}
                        permission={permission}
                        action="remove"
                        disabled={compositionDisabled}
                        onAction={(p) => setPermissionToRemove(p)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.permissionPicker} aria-label="Adicionar permissões ao papel">
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="edit-permission-search">Adicionar permissão</label>
                  <div className={styles.searchField}>
                    <Search size={16} />
                    <input
                      id="edit-permission-search"
                      className={styles.input}
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Buscar permissão ativa"
                      disabled={compositionDisabled}
                    />
                  </div>
                </div>
                {role.status === 'INACTIVE' && (
                  <div className={styles.empty}>Papéis inativos não recebem novas permissões.</div>
                )}
                {permissionsQuery.isLoading && <Loading />}
                {permissionsQuery.isError && (
                  <div className={styles.error}>Não foi possível consultar permissões disponíveis.</div>
                )}
                {permissionsQuery.data && availablePermissions.length === 0 && role.status === 'ACTIVE' && (
                  <div className={styles.empty}>Nenhuma permissão disponível para adicionar.</div>
                )}
                {availablePermissions.length > 0 && role.status === 'ACTIVE' && (
                  <div className={styles.permissionList}>
                    {availablePermissions.map((permission) => (
                      <PermissionLine
                        key={permission.id}
                        permission={permission}
                        action="add"
                        disabled={compositionDisabled}
                        onAction={handleAddPermission}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleConfirmDeactivate}
        title="Desativar papel"
        description={`Desativar o papel "${role.key}"? Usuários com este papel perderão os acessos associados.`}
        confirmLabel="Desativar papel"
        isLoading={deactivateRoleMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!permissionToRemove}
        onClose={() => setPermissionToRemove(null)}
        onConfirm={handleConfirmRemovePermission}
        title="Remover permissão"
        description={`Remover a permissão "${permissionToRemove?.key}" deste papel?`}
        confirmLabel="Remover permissão"
        isLoading={removePermissionMutation.isPending}
      />
    </div>
  );
}
