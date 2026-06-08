import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { Loading } from '@components/ui/loading';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import { RubricaForm } from '../components/RubricaForm';
import { useUpdateRubrica } from '../hooks/useUpdateRubrica';
import { useRubrica } from '../hooks/useRubrica';
import type { AtualizarRubricaData } from '../types/rubrica';
import styles from './RubricaFormPage.module.css';

export function RubricaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const { data: rubrica, isLoading, error, refetch } = useRubrica(id);
  const updateMutation = useUpdateRubrica();

  if (!can('arrecadacao:default:rubrica:editar')) {
    return <ErrorState message="Seu perfil permite consulta, mas não alteração de rubricas." />;
  }

  async function handleSubmit(data: AtualizarRubricaData) {
    try {
      await updateMutation.mutateAsync({ id: id!, data });
      showToast('Rubrica atualizada com sucesso', 'success');
      navigate('/arrecadacao/rubricas');
    } catch (error: unknown) {
      const problem = error as { detail?: string };
      showToast(problem.detail || 'Erro ao atualizar rubrica', 'error');
    }
  }

  if (isLoading) return <Loading />;
  if (error || !rubrica) {
    return <ErrorState message="Rubrica não encontrada" onRetry={refetch} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/rubricas')}
          type="button"
          id="btn-back-editar-rubrica"
        >
          <ArrowLeft size={16} /> Rubricas
        </Button>
        <PageHeader title={rubrica.nome} description="Editar dados da rubrica." />
      </div>
      <div className={styles.card}>
        <RubricaForm
          initialData={rubrica}
          onSubmit={(payload) => handleSubmit(payload as AtualizarRubricaData)}
          onCancel={() => navigate('/arrecadacao/rubricas')}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
