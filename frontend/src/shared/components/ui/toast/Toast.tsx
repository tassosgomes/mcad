import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastProps {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

export function Toast({ message, variant, onClose }: ToastProps) {
  const Icon = icons[variant];

  return (
    <div className={[styles.toast, styles[variant]].join(' ')} role="alert">
      <Icon size={18} className={styles.icon} />
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Fechar notificação"
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}
