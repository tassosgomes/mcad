import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useCreateObra } from '../hooks/useCreateObra';
import { ObraForm } from '../components/ObraForm';
import type { CriarObraRequest } from '../types/obra';
import styles from './ObraCreatePage.module.css';

export function ObraCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateObra();

  async function handleSubmit(data: CriarObraRequest) {
    try {
      await createMutation.mutateAsync(data);
      showToast('Obra criada com sucesso', 'success');
      navigate('/cadastro/obras');
    } catch (err: unknown) {
      const problem = err as { detail?: string };
      showToast(problem.detail || 'Erro ao criar obra', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/cadastro/obras')}
          type="button"
          id="btn-back-obras"
        >
          <ArrowLeft size={16} /> Obras Musicais
        </Button>
        <PageHeader title="Nova Obra" description="Cadastrar uma nova obra musical no sistema" />
      </div>
      <div className={styles.card}>
        <ObraForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/cadastro/obras')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
