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

export function CaptacaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasRole, user } = useAuth();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: captacao, isLoading, error, refetch } = useCaptacao(id);
  const updateMutation = useUpdateCaptacao();
  const deleteMutation = useDeleteCaptacao();

  useDocumentTitle(captacao ? `Captação: ${captacao.rubrica.nome} — Identificação` : 'Detalhe Captação');

  if (isLoading) return <Loading />;
  if (error || !captacao) return <ErrorState onRetry={() => refetch()} />;

  const currentUserId = user?.profile.sub;
  const canWrite = hasRole('analista-identificacao');
  const canEdit = canWrite && captacao.analistaResponsavel.id === currentUserId;
  const canDelete = canEdit && captacao.status === 'ABERTA';

  const temExecucoes = captacao.resumoExecucoes.total > 0;

  const getStatusVariant = (status: string) => {
    switch (status) {
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

  return (
    <div className={styles.container}>
      <PageHeader 
        title={`${captacao.rubrica.nome} — ${formatDate(captacao.periodo)}`}
        action={
          <div className={styles.headerActions}>
            <Badge variant={getStatusVariant(captacao.status) as any}>{captacao.status}</Badge>
            {canDelete && (
              <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                Excluir
              </Button>
            )}
          </div>
        }
      />

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
        canWrite={canWrite}
        currentUserId={currentUserId || ''}
      />

      <DeleteCaptacaoModal
        captacao={captacao}
        totalExecucoes={captacao.resumoExecucoes.total}
        isOpen={isDeleteModalOpen}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
