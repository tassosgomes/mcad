import { useState } from 'react';
import { Archive, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ConfirmModal } from '@components/ui/confirm-modal';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { PermissionStatusBadge } from '../components/PermissionStatusBadge';
import {
  useDeprecatePermissionGoverned,
  usePermissionLinkedRoles,
  usePermissionOperationAvailable,
} from '../hooks/usePermissionLifecycle';
import { usePermissionDetails } from '../hooks/usePermissionsCatalog';
import styles from './PermissionDetailPage.module.css';
import {
  LifecycleActionsPanel,
  LinkedRolesPanel,
  PermissionMetadataPanel,
} from './PermissionDetailPanels';

export function PermissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [confirmDeprecate, setConfirmDeprecate] = useState(false);

  const canCreatePermission = usePermissionOperationAvailable('create');
  const canDeprecateLifecycle = usePermissionOperationAvailable('deprecate');
  const canReactivatePermission = usePermissionOperationAvailable('reactivate');
  const canRemovePermission = usePermissionOperationAvailable('remove');
  const permissionQuery = usePermissionDetails(id ?? null);
  const deprecateMutation = useDeprecatePermissionGoverned();
  const permission = permissionQuery.data;
  const linkedRolesQuery = usePermissionLinkedRoles(permission?.id ?? null);
  const canDeprecatePermission = permission?.status === 'ACTIVE' && canDeprecateLifecycle;

  const handleConfirmDeprecate = () => {
    if (!permission) return;
    deprecateMutation.mutate(permission.id, {
      onSuccess: () => {
        showToast('Permissão depreciada.', 'success');
        setConfirmDeprecate(false);
      },
      onError: () => {
        showToast('Não foi possível depreciar a permissão.', 'error');
        setConfirmDeprecate(false);
      },
    });
  };

  if (permissionQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Loading />
      </div>
    );
  }

  if (permissionQuery.isError || !permission) {
    return (
      <div className={styles.page}>
        <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/autorizacao/permissoes')}>
          <ArrowLeft size={16} />
          Permissões
        </Button>
        <ErrorState message="Não foi possível carregar a permissão." onRetry={() => permissionQuery.refetch()} />
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
          onClick={() => navigate('/autorizacao/permissoes')}
        >
          <ArrowLeft size={16} />
          Permissões
        </Button>
        <PageHeader
          title={permission.displayName}
          description={<span className={styles.mono}>{permission.key}</span>}
          action={(
            <>
              <PermissionStatusBadge status={permission.status} />
              {canDeprecatePermission ? (
                <Button
                  variant="danger"
                  type="button"
                  disabled={deprecateMutation.isPending}
                  onClick={() => setConfirmDeprecate(true)}
                >
                  <Archive size={16} />
                  Depreciar permissão
                </Button>
              ) : null}
            </>
          )}
        />
      </div>

      <PermissionMetadataPanel permission={permission} />

      <LinkedRolesPanel
        eligibility={linkedRolesQuery.data}
        isError={linkedRolesQuery.isError}
        isLoading={linkedRolesQuery.isLoading}
        onRetry={() => linkedRolesQuery.refetch()}
      />

      <LifecycleActionsPanel
        canCreatePermission={canCreatePermission}
        canReactivatePermission={canReactivatePermission}
        canRemovePermission={canRemovePermission}
      />

      <ConfirmModal
        isOpen={confirmDeprecate}
        onClose={() => setConfirmDeprecate(false)}
        onConfirm={handleConfirmDeprecate}
        title="Depreciar permissão"
        description={`Depreciar a permissão "${permission.key}"? Esta é a etapa obrigatória antes de uma remoção governada futura.`}
        confirmLabel="Depreciar permissão"
        isLoading={deprecateMutation.isPending}
      />
    </div>
  );
}
