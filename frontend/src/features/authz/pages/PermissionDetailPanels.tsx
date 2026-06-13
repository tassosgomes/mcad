import type { ReactNode } from 'react';
import { AlertTriangle, Archive, Link2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { getPermissionStatusLabel } from '../contract/authzPermissionLifecycleContract';
import type { LinkedRole, Permission, PermissionRemovalEligibility } from '../types/permission';
import styles from './PermissionDetailPage.module.css';

export function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value || '-'}</span>
    </div>
  );
}

export function PermissionMetadataPanel({ permission }: { permission: Permission }) {
  return (
    <section className={styles.card} aria-labelledby="permission-metadata-title">
      <SectionHeader
        id="permission-metadata-title"
        icon={<Archive size={18} aria-hidden="true" />}
        title="Detalhes da permissão"
        description={`Status atual: ${getPermissionStatusLabel(permission.status)}.`}
      />

      {permission.description && (
        <p className={styles.description}>{permission.description}</p>
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
    </section>
  );
}

export function LinkedRolesPanel({
  eligibility,
  isLoading,
  isError,
  onRetry,
}: {
  eligibility?: PermissionRemovalEligibility;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <section className={styles.card} aria-labelledby="linked-roles-title" aria-busy="true">
        <SectionHeader
          id="linked-roles-title"
          icon={<Link2 size={18} aria-hidden="true" />}
          title="Papéis vinculados"
          description="Verificando vínculos e elegibilidade de remoção."
        />
        <p className={styles.mutedMessage}>Carregando papéis vinculados...</p>
      </section>
    );
  }

  if (isError || !eligibility) {
    return (
      <section className={styles.card} aria-labelledby="linked-roles-title">
        <SectionHeader
          id="linked-roles-title"
          icon={<AlertTriangle size={18} aria-hidden="true" />}
          title="Papéis vinculados"
          description="Não foi possível consultar vínculos no BFF."
        />
        <ErrorState message="Não foi possível carregar papéis vinculados." onRetry={onRetry} />
      </section>
    );
  }

  const linkedRoles = eligibility.linkedRoles;

  return (
    <section className={styles.card} aria-labelledby="linked-roles-title">
      <SectionHeader
        id="linked-roles-title"
        icon={<Link2 size={18} aria-hidden="true" />}
        title="Papéis vinculados"
        description="Use estes vínculos para decidir depreciação e remoção governada."
      />

      <div
        className={`${styles.eligibility} ${eligibility.canRemove ? styles.eligible : styles.blocked}`}
        role="status"
      >
        <strong>{eligibility.canRemove ? 'Elegível pela regra de vínculos' : 'Remoção bloqueada'}</strong>
        <span>{getEligibilityMessage(eligibility)}</span>
      </div>

      {linkedRoles.length > 0 ? (
        <ul className={styles.roleList} aria-label="Papéis vinculados à permissão">
          {linkedRoles.map((role) => (
            <li className={styles.roleItem} key={role.id}>
              <div className={styles.roleContent}>
                <span className={styles.roleName}>{role.displayName}</span>
                <span className={`${styles.roleKey} ${styles.mono}`}>{role.key}</span>
              </div>
              <Badge variant={role.status === 'ACTIVE' ? 'success' : 'muted'}>
                {getRoleStatusLabel(role.status)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>Nenhum papel vinculado a esta permissão.</p>
      )}
    </section>
  );
}

export function LifecycleActionsPanel({
  canCreatePermission,
  canReactivatePermission,
  canRemovePermission,
}: {
  canCreatePermission: boolean;
  canReactivatePermission: boolean;
  canRemovePermission: boolean;
}) {
  return (
    <section className={styles.card} aria-labelledby="lifecycle-actions-title">
      <SectionHeader
        id="lifecycle-actions-title"
        icon={<AlertTriangle size={18} aria-hidden="true" />}
        title="Operações governadas"
        description="Nesta fase, apenas a depreciação está operacional no contrato atual do ecad-authz."
      />

      <div className={styles.deprecationNotice}>
        <strong>Depreciação é pré-requisito para remoção.</strong>
        <span>
          A remoção futura exigirá status depreciado, ausência de papéis ativos vinculados e confirmação literal{' '}
          <span className={styles.mono}>CONFIRMO</span>.
        </span>
      </div>

      <div className={styles.actionGrid}>
        <UnavailableAction
          icon={<Plus size={18} aria-hidden="true" />}
          title="Cadastrar permissão"
          description="Indisponível por dependência externa: falta POST /v1/permissions no ecad-authz."
          capabilityAvailable={canCreatePermission}
        />
        <UnavailableAction
          icon={<RotateCcw size={18} aria-hidden="true" />}
          title="Reativar permissão"
          description="Indisponível por dependência externa: falta POST /v1/permissions/{permissionId}/reactivate no ecad-authz."
          capabilityAvailable={canReactivatePermission}
        />
        <UnavailableAction
          icon={<Trash2 size={18} aria-hidden="true" />}
          title="Remover permissão"
          description="Indisponível por dependência externa: falta POST /v1/permissions/{permissionId}/remove no ecad-authz."
          capabilityAvailable={canRemovePermission}
        />
      </div>
    </section>
  );
}

function SectionHeader({
  id,
  icon,
  title,
  description,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIcon}>{icon}</span>
      <div>
        <h2 id={id} className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
    </div>
  );
}

function UnavailableAction({
  icon,
  title,
  description,
  capabilityAvailable,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  capabilityAvailable: boolean;
}) {
  const reasonId = `${title.toLowerCase().replace(/\s+/g, '-')}-reason`;

  return (
    <div className={styles.unavailableAction}>
      <div className={styles.actionCopy}>
        <span className={styles.actionIcon}>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p id={reasonId}>{description}</p>
        </div>
      </div>
      <Button variant="secondary" type="button" disabled={!capabilityAvailable} aria-describedby={reasonId}>
        Indisponível
      </Button>
    </div>
  );
}

function getRoleStatusLabel(status: LinkedRole['status']): string {
  return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
}

function getEligibilityMessage(eligibility: PermissionRemovalEligibility): string {
  if (eligibility.canRemove && eligibility.linkedRoles.length === 0) {
    return 'Sem vínculos com papéis. A permissão está livre de dependências para remoção quando o endpoint do ecad-authz estiver disponível.';
  }

  if (eligibility.canRemove) {
    return 'Há vínculos históricos ou inativos, mas nenhum papel ativo bloqueia a remoção quando o endpoint do ecad-authz estiver disponível.';
  }

  if (eligibility.blockingReason === 'ROLE_LINKS_PRESENT') {
    return 'Com vínculos ativos. Remova a permissão dos papéis vinculados antes de solicitar a remoção definitiva.';
  }

  if (eligibility.blockingReason === 'STATUS_NOT_DEPRECATED') {
    return 'Status ainda não elegível. A permissão precisa estar depreciada antes de qualquer remoção definitiva.';
  }

  return 'Não foi possível determinar a elegibilidade de remoção neste momento.';
}
