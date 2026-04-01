import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { SomaIndicator } from '@features/cadastro/titularidades/components/SomaIndicator';
import { useParticipacoes } from '../hooks/useParticipacoes';
import { useAddParticipacao } from '../hooks/useAddParticipacao';
import { useRemoveParticipacao } from '../hooks/useRemoveParticipacao';
import { useAjustarPercentual } from '../hooks/useAjustarPercentual';
import { useCalcularPercentuais } from '../hooks/useCalcularPercentuais';
import { AddParticipacaoForm } from './AddParticipacaoForm';
import { ParticipacoesTable } from './ParticipacoesTable';
import { CalcularButton } from './CalcularButton';
import { DesatualizadoBadge } from './DesatualizadoBadge';
import { RecalcularModal } from './RecalcularModal';
import type { AdicionarParticipacaoRequest } from '../types/participacao';
import styles from './ParticipacoesSection.module.css';

interface ParticipacoesSecaoProps {
  fonogramaId: string;
  fonogramaStatus: string;
  onDepuracaoRequired: () => void;
}

export function ParticipacoesSection({
  fonogramaId,
  fonogramaStatus,
  onDepuracaoRequired,
}: ParticipacoesSecaoProps) {
  const { data, isLoading } = useParticipacoes(fonogramaId);
  const addMutation = useAddParticipacao(fonogramaId);
  const removeMutation = useRemoveParticipacao(fonogramaId);
  const ajustarMutation = useAjustarPercentual(fonogramaId);
  const calcularMutation = useCalcularPercentuais(fonogramaId);
  const { showToast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showRecalcularModal, setShowRecalcularModal] = useState(false);

  // Read-only em fonogramas depurados
  const isReadOnly = fonogramaStatus === 'DEPURADO';

  const participacoes = data?.participacoes ?? [];
  const somaCalculada = data?.somaCalculada ?? false;
  const somaPercentual = data?.somaPercentual ?? null;
  const percentuaisDesatualizados = data?.percentuaisDesatualizados ?? false;
  const pendente = !somaCalculada;

  function handleCalcularClick() {
    if (somaCalculada) {
      setShowRecalcularModal(true);
    } else {
      executarCalculo();
    }
  }

  async function executarCalculo() {
    setShowRecalcularModal(false);
    try {
      await calcularMutation.mutateAsync();
      showToast('Percentuais calculados com sucesso', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao calcular percentuais', 'error');
      }
    }
  }

  async function handleAdd(req: AdicionarParticipacaoRequest) {
    try {
      await addMutation.mutateAsync(req);
      showToast('Participante adicionado com sucesso', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao adicionar participante', 'error');
      }
    }
  }

  async function handleRemove(participacaoId: string) {
    try {
      await removeMutation.mutateAsync(participacaoId);
      showToast('Participante removido', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao remover participante', 'error');
      }
    }
  }

  async function handleAjustar(participacaoId: string, percentual: number) {
    try {
      await ajustarMutation.mutateAsync({ participacaoId, data: { percentual } });
      showToast('Percentual ajustado', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao ajustar percentual', 'error');
      }
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>Participações Conexas</h3>
          <span className={styles.count}>
            {participacoes.length} participante{participacoes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.headerActions}>
          {!isReadOnly && !showAddForm && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              type="button"
              id="btn-adicionar-participante"
            >
              <Plus size={14} /> Adicionar Participante
            </Button>
          )}
          {!isReadOnly && participacoes.length > 0 && (
            <CalcularButton
              participacoes={participacoes}
              somaCalculada={somaCalculada}
              isLoading={calcularMutation.isPending}
              onClick={handleCalcularClick}
            />
          )}
        </div>
      </div>

      <DesatualizadoBadge visible={percentuaisDesatualizados && !isReadOnly} />

      {showAddForm && (
        <AddParticipacaoForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={addMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className={styles.loadingState}>Carregando participações...</div>
      ) : (
        <div className={styles.tableContainer}>
          <ParticipacoesTable
            items={participacoes}
            isReadOnly={isReadOnly}
            isRemoving={removeMutation.isPending}
            onAjustarPercentual={handleAjustar}
            onRemove={handleRemove}
          />
          <SomaIndicator
            soma={somaPercentual ?? 0}
            completa={somaCalculada && somaPercentual === 100}
            pendente={pendente && participacoes.length > 0}
          />
        </div>
      )}

      {showRecalcularModal && (
        <RecalcularModal
          onConfirm={executarCalculo}
          onCancel={() => setShowRecalcularModal(false)}
          isLoading={calcularMutation.isPending}
        />
      )}
    </section>
  );
}
