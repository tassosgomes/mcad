import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useCreateLicenca } from '../hooks/useCreateLicenca';
import { LicencaForm } from '../components/LicencaForm';
import type { CriarLicencaRequest } from '../types/licenca';
import styles from './LicencaCreatePage.module.css';

export function LicencaCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateLicenca();

  async function handleSubmit(data: CriarLicencaRequest) {
    try {
      const novaLicenca = await createMutation.mutateAsync(data);
      showToast('Licença criada com sucesso', 'success');
      navigate(`/arrecadacao/licencas/${novaLicenca.id}`);
    } catch (err: unknown) {
      const problem = err as { detail?: string; status?: number };
      if (problem.status === 422) {
        showToast(problem.detail || 'Dados inválidos para criação da licença', 'error');
      } else {
        showToast(problem.detail || 'Erro ao criar licença', 'error');
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/arrecadacao/licencas')}
          type="button"
          id="btn-back-criar-licenca"
        >
          <ArrowLeft size={16} /> Licenças
        </Button>
        <PageHeader
          title="Nova Licença"
          description="Criar uma nova licença de execução pública para um usuário de música."
        />
      </div>
      <div className={styles.card}>
        <LicencaForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/arrecadacao/licencas')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
