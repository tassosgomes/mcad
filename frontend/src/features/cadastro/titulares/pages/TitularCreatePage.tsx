import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useCreateTitular } from '../hooks/useCreateTitular';
import { TitularForm } from '../components/TitularForm';
import type { CriarTitularRequest } from '../types/titular';
import styles from './TitularCreatePage.module.css';

export function TitularCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateTitular();

  async function handleSubmit(data: CriarTitularRequest) {
    try {
      await createMutation.mutateAsync(data as CriarTitularRequest);
      showToast('Titular criado com sucesso', 'success');
      navigate('/cadastro/titulares');
    } catch (err: unknown) {
      const problem = err as { detail?: string; status?: number };
      if (problem.status === 409) {
        showToast(problem.detail || 'Documento já cadastrado no sistema', 'error');
      } else if (problem.status === 422) {
        showToast(problem.detail || 'Documento inválido', 'error');
      } else {
        showToast(problem.detail || 'Erro ao criar titular', 'error');
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/titulares')}
          type="button"
          id="btn-back-criar"
        >
          <ArrowLeft size={16} /> Titulares
        </Button>
        <PageHeader title="Novo Titular" description="Cadastrar pessoa física ou jurídica" />
      </div>
      <div className={styles.card}>
        <TitularForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/cadastro/titulares')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
