import styles from './CancelamentoBanner.module.css';

interface CancelamentoBannerProps {
  justificativa: string;
  canceladoEm?: string;
}

export function CancelamentoBanner({ justificativa, canceladoEm }: CancelamentoBannerProps) {
  const dataFormatada = canceladoEm 
    ? new Date(canceladoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Data indisponível';

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>❌</span>
      <div className={styles.content}>
        <strong className={styles.title}>STATUS CANCELADA: Captação cancelada em {dataFormatada}</strong>
        <p className={styles.justificativa}>Justificativa: {justificativa}</p>
      </div>
    </div>
  );
}
