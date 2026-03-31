import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/toast';
import { useTitularidades } from '../hooks/useTitularidades';
import { useAddTitularidade } from '../hooks/useAddTitularidade';
import { useRemoveTitularidade } from '../hooks/useRemoveTitularidade';
import { TitularidadesTable } from './TitularidadesTable';
import { AddTitularidadeForm } from './AddTitularidadeForm';
import { EditPercentualModal } from './EditPercentualModal';
import { SomaIndicator } from './SomaIndicator';
import type { AdicionarTitularidadeRequest, TitularidadeItem } from '../types/titularidade';
import styles from './TitularidadesSection.module.css';

interface TitularidadesSectionProps {
  obraId: string;
  obraStatus: string;
  onDepuracaoRequired: () => void;
}

export function TitularidadesSection({
  obraId,
  obraStatus,
  onDepuracaoRequired,
}: TitularidadesSectionProps) {
  const { data, isLoading } = useTitularidades(obraId);
  const addMutation = useAddTitularidade(obraId);
  const removeMutation = useRemoveTitularidade(obraId);
  const { showToast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTitularidade, setEditingTitularidade] = useState<TitularidadeItem | null>(null);

  // RF-20: obras depuradas e domínio público são read-only
  const isReadOnly = obraStatus === 'DEPURADA' || obraStatus === 'DOMINIO_PUBLICO';

  async function handleAdd(req: AdicionarTitularidadeRequest) {
    try {
      await addMutation.mutateAsync(req);
      showToast('Titular adicionado com sucesso', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao adicionar titular', 'error');
      }
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeMutation.mutateAsync(id);
      showToast('Titular removido', 'success');
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
      } else {
        showToast(err.detail || 'Erro ao remover titular', 'error');
      }
    }
  }

  const titularidades = data?.titularidades ?? [];
  const somaPercentual = data?.somaPercentual ?? 0;
  const somaCompleta = data?.somaCompleta ?? false;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>Titulares Autorais</h3>
          <span className={styles.count}>{titularidades.length} titular{titularidades.length !== 1 ? 'es' : ''}</span>
        </div>
        {!isReadOnly && !showAddForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(true)}
            type="button"
            id="btn-adicionar-titular"
          >
            <Plus size={14} /> Adicionar Titular
          </Button>
        )}
      </div>

      {showAddForm && (
        <AddTitularidadeForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isSubmitting={addMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className={styles.loadingState}>Carregando titularidades...</div>
      ) : (
        <div className={styles.tableContainer}>
          <TitularidadesTable
            items={titularidades}
            isReadOnly={isReadOnly}
            isRemoving={removeMutation.isPending}
            onEdit={(id) => {
              const item = titularidades.find((t) => t.id === id);
              if (item) setEditingTitularidade(item);
            }}
            onRemove={handleRemove}
          />
          <SomaIndicator soma={somaPercentual} completa={somaCompleta} />
        </div>
      )}

      {editingTitularidade && (
        <EditPercentualModal
          obraId={obraId}
          titularidade={editingTitularidade}
          onClose={() => setEditingTitularidade(null)}
          onDepuracaoRequired={() => {
            setEditingTitularidade(null);
            onDepuracaoRequired();
          }}
        />
      )}
    </section>
  );
}
