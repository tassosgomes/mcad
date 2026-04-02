import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/ui/page-header';
import { useToast } from '@components/ui/toast';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

import type { CriarCaptacaoRequest } from '../types/captacao';
import { useCreateCaptacao } from '../hooks/useCreateCaptacao';
import { CaptacaoForm } from '../components/CaptacaoForm';

export function CaptacaoCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createMutation = useCreateCaptacao();

  useDocumentTitle('Nova Captação — Identificação');

  const handleSubmit = async (data: any) => {
    try {
      const payload = data as CriarCaptacaoRequest;
      await createMutation.mutateAsync(payload);
      showToast('Captação criada com sucesso', 'success');
      navigate('/identificacao/captacoes');
    } catch (err: unknown) {
      const problem = err as { code?: string; detail?: string };
      if (problem.code === 'CAPTACAO_DUPLICADA') {
        showToast(problem.detail || 'Já existe captação ativa para esta rubrica e período.', 'error');
      } else {
        showToast(problem.detail || 'Erro ao criar captação.', 'error');
      }
    }
  };

  return (
    <div>
      <PageHeader title="Nova Captação" />
      <CaptacaoForm
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
