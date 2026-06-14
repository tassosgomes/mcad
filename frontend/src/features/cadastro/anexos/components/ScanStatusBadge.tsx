import type { StatusAnexoScan } from '../types/anexo';
import styles from './ScanStatusBadge.module.css';

interface Props {
  status: StatusAnexoScan;
}

export function ScanStatusBadge({ status }: Props) {
  if (status === 'pending_scan') {
    return (
      <span className={`${styles.badge} ${styles.pending}`}>
        <span className={styles.spinner} aria-hidden="true" />
        Verificando vírus...
      </span>
    );
  }
  if (status === 'clean') {
    return (
      <span className={`${styles.badge} ${styles.clean}`}>
        ✓ Limpo
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles.infected}`}>
      ✕ Infectado — arquivo bloqueado
    </span>
  );
}
