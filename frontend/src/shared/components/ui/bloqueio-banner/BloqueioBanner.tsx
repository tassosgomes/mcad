import { Ban } from 'lucide-react';
import styles from './bloqueio-banner.module.css';

interface BloqueioBannerProps {
  justificativa: string;
}

export function BloqueioBanner({ justificativa }: BloqueioBannerProps) {
  return (
    <div className={styles.banner}>
      <Ban size={20} className={styles.icon} />
      <div className={styles.content}>
        <strong>Esta entidade está bloqueada</strong>
        <p>{justificativa}</p>
      </div>
    </div>
  );
}
