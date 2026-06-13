import { useState } from 'react';
import { Archive, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ConfirmModal } from '@components/ui/confirm-modal';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { Modal } from '@components/ui/modal';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { PermissionStatusBadge } from '../components/PermissionStatusBadge';
import {
  useDeprecatePermissionGoverned,
  usePermissionLinkedRoles,
  usePermissionOperationAvailable,
  useReactivatePermission,
  useRemovePermission,
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
  const [confirmReactivate, setConfirmReactivate] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeConfirmationText, setRemoveConfirmationText] = useState('');

  const canCreatePermission = usePermissionOperationAvailable('create');
  const canDeprecateLifecycle = usePermissionOperationAvailable('deprecate');
  const canReactivatePermission = usePermissionOperationAvailable('reactivate');
  const canRemovePermission = usePermissionOperationAvailable('remove');
  const permissionQuery = usePermissionDetails(id ?? null);
  const deprecateMutation = useDeprecatePermissionGoverned();
  const reactivateMutation = useReactivatePermission();
  const removeMutation = useRemovePermission();
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

  const handleConfirmReactivate = () => {
    if (!permission) return;
    reactivateMutation.mutate(permission.id, {
      onSuccess: () => {
        showToast('Permissão reativada.', 'success');
        setConfirmReactivate(false);
      },
      onError: () => {
        showToast('Não foi possível reativar a permissão.', 'error');
        setConfirmReactivate(false);
      },
    });
  };

  const handleConfirmRemove = () => {
    if (!permission) return;
    removeMutation.mutate(
      { permissionId: permission.id, confirmationText: removeConfirmationText },
      {
        onSuccess: () => {
          showToast('Permissão removida.', 'success');
          setConfirmRemove(false);
          setRemoveConfirmationText('');
        },
        onError: () => {
          showToast('Não foi possível remover a permissão.', 'error');
        },
      },
    );
  };

  const closeRemoveModal = () => {
    if (removeMutation.isPending) return;
    setConfirmRemove(false);
    setRemoveConfirmationText('');
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
        permission={permission}
        eligibility={linkedRolesQuery.data}
        isReactivatePending={reactivateMutation.isPending}
        isRemovePending={removeMutation.isPending}
        onReactivate={() => setConfirmReactivate(true)}
        onRemove={() => setConfirmRemove(true)}
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

      <ConfirmModal
        isOpen={confirmReactivate}
        onClose={() => setConfirmReactivate(false)}
        onConfirm={handleConfirmReactivate}
        title="Reativar permissão"
        description={`Reativar a permissão "${permission.key}" e restaurar o status Ativa?`}
        confirmLabel="Reativar permissão"
        isLoading={reactivateMutation.isPending}
      />

      <Modal
        isOpen={confirmRemove}
        onClose={closeRemoveModal}
        title="Remover permissão"
        actions={(
          <>
            <Button variant="ghost" type="button" onClick={closeRemoveModal} disabled={removeMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending || removeConfirmationText !== 'CONFIRMO'}
            >
              Remover permissão
            </Button>
          </>
        )}
      >
        <div className={styles.removeDialogContent}>
          <p>
            Esta ação transiciona a permissão <span className={styles.mono}>{permission.key}</span> para Removida.
            Digite <span className={styles.mono}>CONFIRMO</span> para continuar.
          </p>
          <div className={styles.removeField}>
            <label className={styles.removeLabel} htmlFor="permission-remove-confirmation">
              Confirmação obrigatória
            </label>
            <input
              id="permission-remove-confirmation"
              className={`${styles.removeInput} ${styles.mono}`}
              value={removeConfirmationText}
              onChange={(event) => setRemoveConfirmationText(event.target.value)}
              aria-describedby="permission-remove-confirmation-help"
              autoComplete="off"
            />
            <span id="permission-remove-confirmation-help" className={styles.removeHelp}>
              O valor deve ser exatamente CONFIRMO.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
