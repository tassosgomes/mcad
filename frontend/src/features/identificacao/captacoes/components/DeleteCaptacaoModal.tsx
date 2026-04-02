import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import type { Captacao } from '../types/captacao';
import styles from './DeleteCaptacaoModal.module.css';

interface DeleteCaptacaoModalProps {
  captacao: Captacao | null;
  totalExecucoes?: number;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCaptacaoModal({
  captacao,
  totalExecucoes = 0,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteCaptacaoModalProps) {
  if (!captacao) return null;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString + 'T12:00:00Z');
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const Actions = () => (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
        Cancelar
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
        {isDeleting ? 'Excluindo...' : 'Excluir'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Excluir Captação"
      actions={<Actions />}
    >
      <div className={styles.content}>
        <p>
          Tem certeza que deseja excluir a captação de{' '}
          <strong>{captacao.rubrica.nome}</strong> em{' '}
          <strong>{formatDate(captacao.periodo)}</strong>?
        </p>
        
        {totalExecucoes > 0 && (
          <div className={styles.warningBox}>
            <p className={styles.warningText}>
              Esta captação possui <strong>{totalExecucoes} execuções</strong> que também serão removidas.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
