import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@components/ui/page-header';
import { Button } from '@components/ui/button';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { useToast } from '@components/ui/toast';
import { useDisponiveis } from '../hooks/useDisponiveis';
import { useCriarProcesso } from '../hooks/useProcessoMutations';
import { DisponibilidadeList } from '../components/DisponibilidadeList';
import type { Disponibilidade } from '../types/processo';
import styles from './CriarProcessoPage.module.css';

export function CriarProcessoPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: disponiveis, isLoading, error, refetch } = useDisponiveis();
  const criar = useCriarProcesso();

  async function handleSelect(item: Disponibilidade) {
    try {
      const processo = await criar.mutateAsync({
        rubricaSigla: item.rubrica.sigla,
        periodo: item.periodo,
      });
      addToast({ type: 'success', title: 'Sucesso', message: 'Processo criado com sucesso!' });
      navigate(`/distribuicao/processos/${processo.id}`);
    } catch (err: unknown) {
      const problem = err as { detail?: string; status?: number };
      let message = problem.detail || 'Erro ao criar processo';

      if (problem.status === 409) {
        message = 'Já existe um processo ativo para esta rubrica e período.';
      } else if (problem.status === 422) {
        message = problem.detail || 'Pré-requisitos não atendidos (Rol ou Verba ausente).';
      }

      addToast({ type: 'error', title: 'Erro', message });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topNav}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/distribuicao/processos')}
          type="button"
          id="btn-back-criar-processo"
        >
          <ArrowLeft size={16} /> Processos
        </Button>
      </div>

      <PageHeader
        title="Novo Processo de Distribuição"
        description="Selecione uma combinação rubrica + período disponível para iniciar o processo de distribuição."
      />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message="Erro ao carregar disponibilidades" onRetry={refetch} />
      ) : (
        <DisponibilidadeList
          items={disponiveis ?? []}
          onSelect={handleSelect}
          isCreating={criar.isPending}
        />
      )}
    </div>
  );
}
