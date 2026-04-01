import { Button } from '@components/ui/button';
import styles from './RecalcularModal.module.css';

interface RecalcularModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RecalcularModal({ onConfirm, onCancel, isLoading }: RecalcularModalProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal}>
        <h3 id="modal-title" className={styles.title}>Recalcular percentuais?</h3>
        <p className={styles.body}>
          Os percentuais serão recalculados automaticamente conforme as regras do ECAD.
          <br />
          <strong>Ajustes manuais serão perdidos.</strong> Deseja continuar?
        </p>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel} type="button" disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} type="button" disabled={isLoading}>
            {isLoading ? 'Calculando...' : 'Recalcular'}
          </Button>
        </div>
      </div>
    </div>
  );
}
