import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Plus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissionsCatalog } from '../hooks/usePermissionsCatalog';
import { useAddPermissionToRole, useCreateRole } from '../hooks/useRolesCatalog';
import type { PermissionFilters, PermissionSummary } from '../types/permission';
import type { RoleCreateRequest } from '../types/role';
import styles from './RoleCreatePage.module.css';

const PERMISSION_PAGE_SIZE = 100;

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
    .replace(/[̀-ͯ]/g, '')
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

function toCreatePayload(form: RoleFormState): RoleCreateRequest {
  return {
    key: buildRoleKey(form),
    domain: normalizeSegment(form.domain),
    area: normalizeSegment(form.area) || null,
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
  onToggle: (key: string) => void;
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

export function RoleCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);

  const createRoleMutation = useCreateRole();
  const addPermissionMutation = useAddPermissionToRole();
  const roleKey = buildRoleKey(form);
  const submitting = createRoleMutation.isPending || addPermissionMutation.isPending;

  const permissionFilters: PermissionFilters = {
    domain: normalizeSegment(form.domain),
    area: '',
    service: '',
    status: 'ACTIVE',
    q: permissionSearch,
  };
  const permissionsQuery = usePermissionsCatalog(permissionFilters, 0, PERMISSION_PAGE_SIZE);

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissionKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((k) => k !== permissionKey)
        : [...current, permissionKey],
    );
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizeSegment(form.domain) || !normalizeSegment(form.area) || !normalizeSegment(form.slug)) {
      showToast('Informe domínio, área e identificador para gerar a chave do papel.', 'error');
      return;
    }

    if (!form.displayName.trim()) {
      showToast('Informe o nome de exibição do papel.', 'error');
      return;
    }

    try {
      const createdRole = await createRoleMutation.mutateAsync(toCreatePayload(form));
      for (const permissionKey of selectedPermissionKeys) {
        await addPermissionMutation.mutateAsync({ roleId: createdRole.id, permissionKey });
      }
      showToast(
        selectedPermissionKeys.length > 0
          ? 'Papel criado com as permissões selecionadas.'
          : 'Papel criado.',
        'success',
      );
      navigate(`/autorizacao/papeis/${createdRole.id}`);
    } catch {
      showToast('Não foi possível criar o papel no serviço de autorização.', 'error');
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setPermissionSearch('');
    setSelectedPermissionKeys([]);
  };

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
          title="Novo Papel"
          description="Defina a chave, metadados e permissões iniciais do papel."
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <h2 className={styles.cardTitle}>Identificação</h2>
          <p className={styles.cardDescription}>
            A chave é gerada automaticamente a partir do domínio, área e identificador.
          </p>

          <form className={styles.form} id="role-create-form" onSubmit={handleCreate}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-role-domain">Domínio</label>
                <input
                  id="new-role-domain"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.domain}
                  onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
                  placeholder="cadastro"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-role-area">Área</label>
                <input
                  id="new-role-area"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.area}
                  onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="gestao"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-role-slug">Identificador</label>
                <input
                  id="new-role-slug"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="analista"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-role-name">Nome de exibição</label>
                <input
                  id="new-role-name"
                  className={styles.input}
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Analista de Cadastro"
                />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="new-role-description">Descrição</label>
                <textarea
                  id="new-role-description"
                  className={styles.textarea}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Responsabilidades e escopo operacional do papel"
                />
              </div>
            </div>

            <div className={styles.keyPreview}>
              <span className={styles.label}>Chave gerada</span>
              <span className={`${styles.primaryText} ${styles.mono}`}>{roleKey || '—'}</span>
            </div>

            <div className={styles.actions}>
              <Button type="submit" form="role-create-form" disabled={submitting}>
                <Plus size={16} />
                Cadastrar papel
              </Button>
              <Button variant="ghost" type="button" disabled={submitting} onClick={handleReset}>
                <RotateCcw size={16} />
                Limpar
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.permissionsCard}>
          <div className={styles.pickerHeader}>
            <div>
              <h2 className={styles.cardTitle}>Permissões iniciais</h2>
              <p className={styles.cardDescription}>
                Permissões ativas do domínio informado. Podem ser alteradas após a criação.
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
              onChange={(e) => setPermissionSearch(e.target.value)}
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
      </div>
    </div>
  );
}
