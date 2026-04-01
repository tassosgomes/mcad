import styles from './DeleteFonogramaModal.module.css';

interface DeleteFonogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isrcFormatted: string;
  isDeleting: boolean;
}

export function DeleteFonogramaModal({
  isOpen,
  onClose,
  onConfirm,
  isrcFormatted,
  isDeleting,
}: DeleteFonogramaModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h3 className={styles.title}>Excluir Fonograma</h3>
        <p className={styles.message}>
          Tem certeza que deseja excluir o fonograma <strong>{isrcFormatted}</strong>?
          <br /><br />
          Esta ação não poderá ser desfeita. Vínculos e direitos associados podem ser perdidos.
        </p>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isDeleting} type="button">
            Cancelar
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={isDeleting} type="button">
            {isDeleting ? 'Excluindo...' : 'Sim, excluir fonograma'}
          </button>
        </div>
      </div>
    </div>
  );
}
