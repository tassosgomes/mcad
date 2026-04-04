import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useAuth } from '@shared/auth';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import styles from './CaptacaoDetailPage.module.css';

import type { AtualizarCaptacaoRequest } from '../types/captacao';
import { useCaptacao } from '../hooks/useCaptacao';
import { useUpdateCaptacao } from '../hooks/useUpdateCaptacao';
import { useDeleteCaptacao } from '../hooks/useDeleteCaptacao';
import { CaptacaoForm } from '../components/CaptacaoForm';
import { DeleteCaptacaoModal } from '../components/DeleteCaptacaoModal';
import { ExecucoesSection } from '../components/ExecucoesSection';
import { UploadsSection } from '../components/UploadsSection';
import { FecharRolButton } from '../components/FecharRolButton';
import { FecharRolModal } from '../components/FecharRolModal';
import { useFecharRol } from '../hooks/useFecharRol';
import { CancelarRolButton } from '../components/CancelarRolButton';
import { CancelamentoBanner } from '../components/CancelamentoBanner';

export function CaptacaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasRole, user } = useAuth();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: captacao, isLoading, error, refetch } = useCaptacao(id);
  const updateMutation = useUpdateCaptacao();
  const deleteMutation = useDeleteCaptacao();
  const fecharRolMutation = useFecharRol();
  const [isFecharModalOpen, setIsFecharModalOpen] = useState(false);

  useDocumentTitle(captacao ? `Captação: ${captacao.rubrica.nome} — Identificação` : 'Detalhe Captação');

  if (isLoading) return <Loading />;
  if (error || !captacao) return <ErrorState onRetry={() => refetch()} />;

  const isFechada = captacao.status?.toUpperCase() === 'FECHADA';
  const currentUserId = user?.profile.sub;
  const isOwner = captacao.analistaResponsavel.id === currentUserId;
  const canWrite = hasRole('analista-identificacao');
  const canEdit = canWrite && isOwner && !isFechada && captacao.status !== 'CANCELADA';
  const canDelete = canEdit && captacao.status?.toUpperCase() === 'ABERTA';

  const temExecucoes = captacao.resumoExecucoes.total > 0;

  const getStatusVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ABERTA': return 'accent';
      case 'FECHADA': return 'success';
      case 'CANCELADA': return 'muted';
      default: return 'muted';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString + 'T12:00:00Z');
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const handleUpdate = async (data: any) => {
    try {
      const payload = data as AtualizarCaptacaoRequest;
      await updateMutation.mutateAsync({ id: captacao.id, data: payload });
      showToast('Captação atualizada com sucesso', 'success');
    } catch (err: unknown) {
      const problem = err as { code?: string; detail?: string };
      switch (problem.code) {
        case 'CAPTACAO_DUPLICADA':
          showToast(problem.detail || 'Já existe captação para esta rubrica e período.', 'error');
          break;
        case 'RUBRICA_BLOQUEADA':
          showToast('Não é possível alterar a rubrica com execuções vinculadas.', 'error');
          break;
        case 'STATUS_INVALIDO':
          showToast('Apenas captações ABERTAS podem ser editadas.', 'error');
          break;
        case 'FORBIDDEN':
          showToast('Apenas o analista responsável pode modificar a captação.', 'error');
          break;
        default:
          showToast(problem.detail || 'Erro ao atualizar captação.', 'error');
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(captacao.id);
      showToast('Captação excluída com sucesso', 'success');
      navigate('/identificacao/captacoes');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir captação.', 'error');
    }
  };

  const handleFecharRol = async () => {
    try {
      await fecharRolMutation.mutateAsync(captacao.id);
      showToast('Rol de captação fechado com sucesso!', 'success');
      setIsFecharModalOpen(false);
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao fechar rol.', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader 
        title={`${captacao.rubrica.nome} — ${formatDate(captacao.periodo)}`}
        action={
          <div className={styles.headerActions}>
            <Badge variant={getStatusVariant(captacao.status) as any}>{captacao.status}</Badge>
            {captacao.status?.toUpperCase() === 'ABERTA' && isOwner && canWrite && (
              <FecharRolButton onClick={() => setIsFecharModalOpen(true)} />
            )}
            {captacao.status?.toUpperCase() === 'FECHADA' && isOwner && canWrite && (
              <CancelarRolButton captacao={captacao} />
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                Excluir
              </Button>
            )}
          </div>
        }
      />

      {captacao.status?.toUpperCase() === 'CANCELADA' && captacao.justificativaCancelamento && (
        <CancelamentoBanner 
          justificativa={captacao.justificativaCancelamento} 
          canceladoEm={captacao.canceladoEm} 
        />
      )}

      <div className={styles.resumoCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Execuções Totais</span>
          <span className={styles.cardValue}>{captacao.resumoExecucoes.total}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Identificadas</span>
          <span className={styles.cardValue}>{captacao.resumoExecucoes.identificadas}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Pendentes</span>
          <span className={styles.cardValue}>{captacao.resumoExecucoes.pendentes}</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <CaptacaoForm
          initialData={captacao}
          temExecucoes={temExecucoes}
          onSubmit={handleUpdate}
          onCancel={() => navigate('/identificacao/captacoes')}
          isSubmitting={updateMutation.isPending}
        />
      </div>

      <ExecucoesSection
        captacao={captacao}
        canWrite={canEdit}
        currentUserId={currentUserId || ''}
      />

      <UploadsSection
        captacaoId={captacao.id}
        captacaoAberta={captacao.status?.toUpperCase() === 'ABERTA'}
        isOwner={canEdit}
      />

      <DeleteCaptacaoModal
        captacao={captacao}
        totalExecucoes={captacao.resumoExecucoes.total}
        isOpen={isDeleteModalOpen}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <FecharRolModal
        captacaoId={captacao.id}
        isOpen={isFecharModalOpen}
        isClosing={fecharRolMutation.isPending}
        onConfirm={handleFecharRol}
        onCancel={() => setIsFecharModalOpen(false)}
      />
    </div>
  );
}
