import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { useTitular } from '../hooks/useTitular';
import { useUpdateTitular } from '../hooks/useUpdateTitular';
import { TitularForm } from '../components/TitularForm';
import { AnexosSection } from '@features/cadastro/anexos';
import type { AtualizarTitularRequest } from '../types/titular';
import styles from './TitularEditPage.module.css';

export function TitularEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: titular, isLoading, error, refetch } = useTitular(id);
  const updateMutation = useUpdateTitular();

  async function handleSubmit(data: AtualizarTitularRequest) {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      showToast('Titular atualizado com sucesso', 'success');
      navigate('/cadastro/titulares');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao atualizar titular', 'error');
    }
  }

  if (isLoading) return <Loading />;
  if (error || !titular) {
    return <ErrorState message="Titular não encontrado" onRetry={refetch} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/titulares')}
          type="button"
          id="btn-back-editar"
        >
          <ArrowLeft size={16} /> Titulares
        </Button>
        <PageHeader
          title={`Titular #${titular.codigo}`}
          description={titular.nome}
        />
      </div>
      <div className={styles.card}>
        <TitularForm
          initialData={titular}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/cadastro/titulares')}
          isSubmitting={updateMutation.isPending}
        />
      </div>
      <div className={styles.card}>
        <AnexosSection tipo="Titular" entidadeId={titular.id} />
      </div>
    </div>
  );
}
