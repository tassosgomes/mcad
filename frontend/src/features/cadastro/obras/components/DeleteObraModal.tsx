import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import type { ObraMusical } from '../types/obra';
import styles from './DeleteObraModal.module.css';

interface DeleteObraModalProps {
  obra: ObraMusical | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteObraModal({
  obra,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteObraModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir Obra"
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting} type="button">
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting} type="button">
            {isDeleting ? 'Excluindo...' : 'Excluir Obra'}
          </Button>
        </>
      }
    >
      {obra && (
        <div className={styles.content}>
          <p className={styles.message}>
            Tem certeza que deseja excluir esta obra musical{' '}
            <strong className={styles.name}>{obra.titulo}</strong>?
          </p>
          <div className={styles.warning}>
            <span>Esta ação removerá permanentemente os dados se não houver vínculos ativos.</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
