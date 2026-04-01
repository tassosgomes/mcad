import { CheckCircle, Ban, Unlock, Loader2 } from 'lucide-react';
import { Button } from '../button';
import styles from './status-actions.module.css';

interface LiberarButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function LiberarButton({ onClick, isLoading, disabled }: LiberarButtonProps) {
  return (
    <Button 
      variant="primary" 
      onClick={onClick} 
      disabled={disabled || isLoading}
      className={styles.liberarBtn}
    >
      {isLoading ? <Loader2 size={16} className={styles.spinner} /> : <><CheckCircle size={16} /> Liberar</>}
    </Button>
  );
}

export function BloquearButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <Button variant="danger" onClick={onClick} disabled={isLoading}>
      {isLoading ? <Loader2 size={16} className={styles.spinner} /> : <><Ban size={16} /> Bloquear</>}
    </Button>
  );
}

export function DesbloquearButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={isLoading}>
      {isLoading ? <Loader2 size={16} className={styles.spinner} /> : <><Unlock size={16} /> Desbloquear</>}
    </Button>
  );
}
