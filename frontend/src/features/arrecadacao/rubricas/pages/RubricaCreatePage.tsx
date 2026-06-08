import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { ErrorState } from '@components/ui/error-state';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { usePermissions } from '@shared/authz';
import { RubricaForm } from '../components/RubricaForm';
import { useCreateRubrica } from '../hooks/useCreateRubrica';
import type { CriarRubricaData } from '../types/rubrica';
import styles from './RubricaFormPage.module.css';

export function RubricaCreatePage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const createMutation = useCreateRubrica();

  if (!can('arrecadacao:default:rubrica:editar')) {
    return <ErrorState message="Seu perfil permite consulta, mas não cadastro de rubricas." />;
  }

  async function handleSubmit(data: CriarRubricaData) {
    try {
      await createMutation.mutateAsync(data);
      showToast('Rubrica cadastrada com sucesso', 'success');
      navigate('/arrecadacao/rubricas');
    } catch (error: unknown) {
      const problem = error as { detail?: string; status?: number };
      showToast(problem.detail || 'Erro ao cadastrar rubrica', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/rubricas')}
          type="button"
          id="btn-back-criar-rubrica"
        >
          <ArrowLeft size={16} /> Rubricas
        </Button>
        <PageHeader title="Nova Rubrica" description="Cadastro de nova rubrica de arrecadação." />
      </div>
      <div className={styles.card}>
        <RubricaForm
          onSubmit={(payload) => handleSubmit(payload as CriarRubricaData)}
          onCancel={() => navigate('/arrecadacao/rubricas')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
