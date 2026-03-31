import { useState } from 'react';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import type { TitularidadeItem } from '../types/titularidade';
import { useEditTitularidade } from '../hooks/useEditTitularidade';
import { useToast } from '@components/ui/toast';
import styles from './EditPercentualModal.module.css';

interface EditPercentualModalProps {
  obraId: string;
  titularidade: TitularidadeItem;
  onClose: () => void;
  onDepuracaoRequired: () => void;
}

export function EditPercentualModal({
  obraId,
  titularidade,
  onClose,
  onDepuracaoRequired,
}: EditPercentualModalProps) {
  const [percentual, setPercentual] = useState(titularidade.percentual.toFixed(4));
  const editMutation = useEditTitularidade(obraId);
  const { showToast } = useToast();

  const percentualNum = parseFloat(percentual);
  const percentualValid =
    percentual !== '' && !isNaN(percentualNum) && percentualNum > 0 && percentualNum <= 100;

  const hasChanged = percentualNum !== titularidade.percentual;

  async function handleSave() {
    if (!percentualValid || !hasChanged) return;
    try {
      await editMutation.mutateAsync({ id: titularidade.id, data: { percentual: percentualNum } });
      showToast('Percentual atualizado', 'success');
      onClose();
    } catch (err: any) {
      if (err.code === 'DEPURACAO_NECESSARIA') {
        onDepuracaoRequired();
        onClose();
      } else {
        showToast(err.detail || 'Erro ao editar percentual', 'error');
      }
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar Percentual"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} type="button" disabled={editMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            type="button"
            disabled={!percentualValid || !hasChanged || editMutation.isPending}
          >
            {editMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.titularInfo}>
          <span className={styles.titularName}>{titularidade.titular.nome}</span>
          <span className={styles.categoria}>{titularidade.categoria}</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-percentual">
            Percentual (%)
          </label>
          <input
            id="edit-percentual"
            type="number"
            className={styles.input}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            min="0.0001"
            max="100"
            step="0.0001"
            autoFocus
          />
          {percentual !== '' && !percentualValid && (
            <span className={styles.error}>Informe um valor entre 0.0001 e 100</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
