import { AlertTriangle } from 'lucide-react';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import styles from './FinalizarModal.module.css';

interface FinalizarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function FinalizarModal({ isOpen, onClose, onConfirm, isLoading }: FinalizarModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finalizar Processo"
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            id="btn-confirmar-finalizar-processo"
          >
            {isLoading ? 'Finalizando...' : 'Confirmar Finalização'}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={styles.warningBox}>
          <AlertTriangle size={20} className={styles.warningIcon} />
          <p className={styles.warningText}>
            Esta ação é <strong>irreversível</strong>. Os créditos se tornarão definitivos e o Rol
            será bloqueado para cancelamento. Deseja continuar?
          </p>
        </div>
      </div>
    </Modal>
  );
}
