import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { Badge } from '@components/ui/badge';
import { useObra } from '../hooks/useObra';
import { useUpdateObra } from '../hooks/useUpdateObra';
import { useDeleteObra } from '../hooks/useDeleteObra';
import { ObraForm } from '../components/ObraForm';
import { IswcSection } from '../components/IswcSection';
import { DepuracaoBanner } from '../components/DepuracaoBanner';
import { DepuracaoModal } from '../components/DepuracaoModal';
import { DominioPublicoToggle } from '../components/DominioPublicoToggle';
import { DeleteObraModal } from '../components/DeleteObraModal';
import type { AtualizarObraRequest, DepurarObraRequest } from '../types/obra';
import styles from './ObraDetailPage.module.css';

const STATUS_VARIANT: Record<string, string> = {
  PENDENTE: 'warning',
  LIBERADO: 'success',
  BLOQUEADO: 'error',
  DOMINIO_PUBLICO: 'muted',
  DEPURADA: 'secondary',
};

export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const { data: obra, isLoading, error, refetch } = useObra(id);
  const updateMutation = useUpdateObra();
  const deleteMutation = useDeleteObra();

  // Modals state
  const [depuracaoData, setDepuracaoData] = useState<DepurarObraRequest | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleSubmit(data: AtualizarObraRequest) {
    if (!obra) return;
    try {
      await updateMutation.mutateAsync({ id: obra.id, data });
      showToast('Obra atualizada com sucesso', 'success');
    } catch (err: unknown) {
      const problem = err as { code?: string; detail?: string };
      if (problem.code === 'DEPURACAO_NECESSARIA') {
        // Trigger depuração flow
        setDepuracaoData({
          titulo: data.titulo,
          tipo: data.tipo,
          subtitulo: data.subtitulo || null,
          genero: data.genero || null,
        });
      } else {
        showToast(problem.detail || 'Erro ao atualizar obra', 'error');
      }
    }
  }

  async function handleDelete() {
    if (!obra) return;
    try {
      await deleteMutation.mutateAsync(obra.id);
      showToast('Obra excluída com sucesso', 'success');
      navigate('/cadastro/obras');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao excluir obra', 'error');
    }
  }

  if (isLoading) return <Loading />;
  if (error || !obra) return <ErrorState message="Obra não encontrada" onRetry={refetch} />;

  const isReadOnly = obra.status === 'DEPURADA' || obra.status === 'DOMINIO_PUBLICO';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/obras')}
          type="button"
        >
          <ArrowLeft size={16} /> Obras Musicais
        </Button>
        <PageHeader
          title={obra.titulo}
          description={obra.subtitulo || `Obra ${obra.tipo.toLowerCase()} - ID: ${obra.id}`}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Badge variant={STATUS_VARIANT[obra.status] as any}>{obra.status}</Badge>
              {!isReadOnly && (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  type="button"
                  disabled={obra.status === 'DEPURADA'}
                >
                  <Trash2 size={16} /> Excluir
                </Button>
              )}
            </div>
          }
        />
      </div>

      {obra.status === 'DEPURADA' && obra.obraDepuradaParaId && (
        <DepuracaoBanner obraDepuradaParaId={obra.obraDepuradaParaId} />
      )}

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <ObraForm
              initialData={obra}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/cadastro/obras')}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </div>
        <div className={styles.rightCol}>
          <IswcSection obra={obra} temTitulares={true} />
          
          {(obra.status === 'PENDENTE' || obra.status === 'LIBERADO' || obra.status === 'DOMINIO_PUBLICO') && (
            <div className={styles.rightPanel}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: 600 }}>Propriedades</h3>
              <DominioPublicoToggle obra={obra} />
            </div>
          )}
        </div>
      </div>

      <DepuracaoModal
        isOpen={!!depuracaoData}
        onClose={() => setDepuracaoData(null)}
        obraId={obra.id}
        updatedData={depuracaoData}
      />

      <DeleteObraModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
        obra={obra}
      />
    </div>
  );
}
