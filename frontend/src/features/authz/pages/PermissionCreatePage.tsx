import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useCreatePermission } from '../hooks/usePermissionLifecycle';
import type { CreatePermissionInput } from '../types/permission';
import styles from './RoleCreatePage.module.css';

interface PermissionFormState {
  domain: string;
  area: string;
  resource: string;
  action: string;
  displayName: string;
  description: string;
}

const emptyForm: PermissionFormState = {
  domain: 'cadastro',
  area: '',
  resource: '',
  action: '',
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

function buildPermissionKey(form: PermissionFormState): string {
  const domain = normalizeSegment(form.domain);
  const area = normalizeSegment(form.area);
  const resource = normalizeSegment(form.resource);
  const action = normalizeSegment(form.action);
  return [domain, area, resource, action].filter(Boolean).join(':');
}

function toCreatePayload(form: PermissionFormState): CreatePermissionInput {
  return {
    key: buildPermissionKey(form),
    displayName: form.displayName.trim(),
    description: form.description.trim() || null,
    domain: normalizeSegment(form.domain),
    area: normalizeSegment(form.area),
    resource: normalizeSegment(form.resource),
    action: normalizeSegment(form.action),
  };
}

export function PermissionCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState<PermissionFormState>(emptyForm);
  const createPermissionMutation = useCreatePermission();
  const permissionKey = buildPermissionKey(form);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toCreatePayload(form);
    if (!payload.domain || !payload.area || !payload.resource || !payload.action) {
      showToast('Informe domínio, área, recurso e ação para gerar a chave da permissão.', 'error');
      return;
    }

    if (!payload.displayName) {
      showToast('Informe o nome de exibição da permissão.', 'error');
      return;
    }

    try {
      const createdPermission = await createPermissionMutation.mutateAsync(payload);
      showToast('Permissão cadastrada.', 'success');
      navigate(`/autorizacao/permissoes/${createdPermission.id}`);
    } catch {
      showToast('Não foi possível cadastrar a permissão no serviço de autorização.', 'error');
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => navigate('/autorizacao/permissoes')}
        >
          <ArrowLeft size={16} />
          Permissões
        </Button>
        <PageHeader
          title="Nova Permissão"
          description="Cadastre uma permissão administrativa no catálogo oficial do ecad-authz."
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <h2 className={styles.cardTitle}>Identificação</h2>
          <p className={styles.cardDescription}>
            A chave segue o padrão domínio:área:recurso:ação e será criada com status Ativa.
          </p>

          <form className={styles.form} id="permission-create-form" onSubmit={handleCreate}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-permission-domain">Domínio</label>
                <input
                  id="new-permission-domain"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.domain}
                  onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
                  placeholder="cadastro"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-permission-area">Área</label>
                <input
                  id="new-permission-area"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.area}
                  onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="obras"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-permission-resource">Recurso</label>
                <input
                  id="new-permission-resource"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.resource}
                  onChange={(e) => setForm((prev) => ({ ...prev, resource: e.target.value }))}
                  placeholder="obra"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-permission-action">Ação</label>
                <input
                  id="new-permission-action"
                  className={`${styles.input} ${styles.mono}`}
                  value={form.action}
                  onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                  placeholder="aprovar"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="new-permission-name">Nome de exibição</label>
                <input
                  id="new-permission-name"
                  className={styles.input}
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Aprovar obra"
                />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="new-permission-description">Descrição</label>
                <textarea
                  id="new-permission-description"
                  className={styles.textarea}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Explique o escopo de negócio liberado por esta permissão"
                />
              </div>
            </div>

            <div className={styles.keyPreview}>
              <span className={styles.label}>Chave gerada</span>
              <span className={`${styles.primaryText} ${styles.mono}`}>{permissionKey || '-'}</span>
            </div>

            <div className={styles.actions}>
              <Button type="submit" form="permission-create-form" disabled={createPermissionMutation.isPending}>
                <Plus size={16} />
                Cadastrar permissão
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={createPermissionMutation.isPending}
                onClick={handleReset}
              >
                <RotateCcw size={16} />
                Limpar
              </Button>
            </div>
          </form>
        </div>

        <div className={styles.permissionsCard}>
          <h2 className={styles.cardTitle}>Governança</h2>
          <p className={styles.cardDescription}>
            O ecad-authz registra ownership como ecad-authz-service e aplica unicidade, namespace e autorização server-side.
          </p>
          <div className={styles.keyPreview}>
            <span className={styles.label}>Status inicial</span>
            <span className={styles.primaryText}>Ativa</span>
          </div>
          <div className={styles.keyPreview}>
            <span className={styles.label}>Permissão necessária</span>
            <span className={`${styles.primaryText} ${styles.mono}`}>authz:admin:permission:criar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
