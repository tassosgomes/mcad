import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, MinusCircle, Plus, Save, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import {
  useAddPermissionToRole,
  useDeactivateRole,
  useRemovePermissionFromRole,
  useRoleDetails,
  useRolePermissions,
  useUpdateRole,
} from '../hooks/useRolesCatalog';
import type { PermissionFilters, PermissionSummary } from '../types/permission';
import type { Role } from '../types/role';
import styles from '../pages/RolesPage.module.css';

const PERMISSION_PAGE_SIZE = 100;

interface RoleDetailPanelProps {
  roleId: string | null;
  onCreateNew?: () => void;
}

interface EditFormState {
  displayName: string;
  description: string;
}

function toEditForm(role: Role | undefined): EditFormState {
  return {
    displayName: role?.displayName ?? '',
    description: role?.description ?? '',
  };
}

function buildUpdatePayload(form: EditFormState) {
  return {
    displayName: form.displayName.trim(),
    description: form.description.trim() || null,
  };
}

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

export function RoleDetailPanel({ roleId, onCreateNew }: RoleDetailPanelProps) {
  const [form, setForm] = useState<EditFormState>({ displayName: '', description: '' });
  const [permissionSearch, setPermissionSearch] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const roleQuery = useRoleDetails(roleId);
  const rolePermissionsQuery = useRolePermissions(roleId);
  const updateRoleMutation = useUpdateRole();
  const deactivateRoleMutation = useDeactivateRole();
  const addPermissionMutation = useAddPermissionToRole();
  const removePermissionMutation = useRemovePermissionFromRole();

  const role = roleQuery.data;
  const rolePermissions = rolePermissionsQuery.data ?? [];
  const linkedPermissionIds = useMemo(
    () => new Set(rolePermissions.map((permission) => permission.id)),
    [rolePermissions],
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
    (permission) => !linkedPermissionIds.has(permission.id),
  );
  const isMutating =
    updateRoleMutation.isPending
    || deactivateRoleMutation.isPending
    || addPermissionMutation.isPending
    || removePermissionMutation.isPending;
  const compositionDisabled = isMutating || role?.status === 'INACTIVE';

  useEffect(() => {
    setForm(toEditForm(role));
    setPermissionSearch('');
    setFeedback(null);
  }, [role?.id]);

  if (!roleId) {
    return (
      <aside className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <h2 className={styles.panelTitle}>Editar papel</h2>
            <p className={styles.panelDescription}>
              Escolha uma linha para editar metadados, revisar permissões e desativar o papel.
            </p>
          </div>
          {onCreateNew && (
            <Button variant="ghost" type="button" onClick={onCreateNew}>
              <Plus size={16} />
              Novo papel
            </Button>
          )}
        </div>
      </aside>
    );
  }

  if (roleQuery.isLoading) {
    return (
      <aside className={styles.detailPanel}>
        <Loading />
      </aside>
    );
  }

  if (!role) {
    return (
      <aside className={styles.detailPanel}>
        <h2 className={styles.panelTitle}>Papel indisponível</h2>
        <p className={styles.panelDescription}>
          Não foi possível carregar o detalhe do papel selecionado.
        </p>
      </aside>
    );
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (form.displayName.trim().length < 3) {
      setFeedback({ tone: 'error', message: 'Informe um nome com pelo menos 3 caracteres.' });
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        roleId: role.id,
        payload: buildUpdatePayload(form),
      });
      setFeedback({ tone: 'success', message: 'Papel atualizado.' });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível atualizar o papel.' });
    }
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(`Desativar o papel "${role.key}"?`);
    if (!confirmed) return;

    try {
      await deactivateRoleMutation.mutateAsync(role.id);
      setFeedback({ tone: 'success', message: 'Papel desativado.' });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível desativar o papel.' });
    }
  };

  const handleAddPermission = async (permission: PermissionSummary) => {
    setFeedback(null);
    try {
      await addPermissionMutation.mutateAsync({ roleId: role.id, permissionKey: permission.key });
      setFeedback({ tone: 'success', message: 'Permissão adicionada ao papel.' });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível adicionar a permissão.' });
    }
  };

  const handleRemovePermission = async (permission: PermissionSummary) => {
    const confirmed = window.confirm(`Remover a permissão "${permission.key}" deste papel?`);
    if (!confirmed) return;

    setFeedback(null);
    try {
      await removePermissionMutation.mutateAsync({ roleId: role.id, permissionId: permission.id });
      setFeedback({ tone: 'success', message: 'Permissão removida do papel.' });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível remover a permissão.' });
    }
  };

  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.panelTitle}>Editar papel</h2>
          <p className={styles.panelDescription}>{role.displayName}</p>
          <p className={`${styles.panelDescription} ${styles.mono}`}>{role.key}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.status} ${role.status === 'ACTIVE' ? styles.active : styles.inactive}`}>
            {role.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </span>
          {onCreateNew && (
            <Button variant="ghost" type="button" onClick={onCreateNew}>
              <Plus size={16} />
              Novo papel
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={feedback.tone === 'success' ? styles.success : styles.error}>
          {feedback.message}
        </div>
      )}

      <form className={styles.form} onSubmit={handleUpdate}>
        <div className={styles.keyPreview}>
          <span className={styles.label}>Domínio / área</span>
          <span className={`${styles.primaryText} ${styles.mono}`}>
            {role.domain}{role.area ? ` / ${role.area}` : ''}
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-role-name">Nome</label>
          <input
            id="edit-role-name"
            className={styles.input}
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
            disabled={isMutating}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-role-description">Descrição</label>
          <textarea
            id="edit-role-description"
            className={styles.textarea}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            disabled={isMutating}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={isMutating}>
            <Save size={16} />
            Salvar
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={role.status === 'INACTIVE' || isMutating}
            onClick={handleDeactivate}
          >
            <Archive size={16} />
            Desativar
          </Button>
        </div>
      </form>

      <section className={styles.permissionPicker} aria-label="Permissões do papel">
        <div className={styles.pickerHeader}>
          <div>
            <h3 className={styles.panelTitle}>Permissões do papel</h3>
            <p className={styles.panelDescription}>
              {rolePermissions.length} permissões associadas.
            </p>
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
                onAction={handleRemovePermission}
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
              onChange={(event) => setPermissionSearch(event.target.value)}
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
    </aside>
  );
}
