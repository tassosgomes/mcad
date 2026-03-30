import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import type { Titular } from '../types/titular';
import styles from './DeleteTitularModal.module.css';

interface DeleteTitularModalProps {
  titular: Titular | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteTitularModal({
  titular,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteTitularModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir Titular"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting} type="button">
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting} type="button">
            {isDeleting ? 'Excluindo...' : 'Excluir Titular'}
          </Button>
        </>
      }
    >
      {titular && (
        <div className={styles.content}>
          <p className={styles.message}>
            Tem certeza que deseja excluir o titular{' '}
            <strong className={styles.name}>{titular.nome}</strong>?
          </p>
          <div className={styles.warning}>
            <span>Esta ação é permanente e não pode ser desfeita.</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
