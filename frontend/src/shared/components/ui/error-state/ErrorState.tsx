import { AlertCircle, RefreshCw } from 'lucide-react';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Ops! Algo deu errado.', onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <AlertCircle className={styles.icon} size={32} />
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retryButton} onClick={onRetry} type="button">
          <RefreshCw size={16} />
          <span>Tentar novamente</span>
        </button>
      )}
    </div>
  );
}
