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
import { useDeprecatePermission, usePermissionDetails } from '../hooks/usePermissionsCatalog';
import styles from './PermissionDetailPage.module.css';

function DetailItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value || '-'}</span>
    </div>
  );
}

export function PermissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [confirmDeprecate, setConfirmDeprecate] = useState(false);

  const permissionQuery = usePermissionDetails(id ?? null);
  const deprecateMutation = useDeprecatePermission();
  const permission = permissionQuery.data;

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
              <Button
                variant="danger"
                type="button"
                disabled={permission.status === 'DEPRECATED' || deprecateMutation.isPending}
                onClick={() => setConfirmDeprecate(true)}
              >
                <Archive size={16} />
                Depreciar permissão
              </Button>
            </>
          )}
        />
      </div>

      <div className={styles.card}>
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
      </div>

      <ConfirmModal
        isOpen={confirmDeprecate}
        onClose={() => setConfirmDeprecate(false)}
        onConfirm={handleConfirmDeprecate}
        title="Depreciar permissão"
        description={`Depreciar a permissão "${permission.key}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Depreciar permissão"
        isLoading={deprecateMutation.isPending}
      />
    </div>
  );
}
