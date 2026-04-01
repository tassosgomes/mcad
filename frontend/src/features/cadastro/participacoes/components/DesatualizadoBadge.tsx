import styles from './DesatualizadoBadge.module.css';

interface DesatualizadoBadgeProps {
  visible: boolean;
}

export function DesatualizadoBadge({ visible }: DesatualizadoBadgeProps) {
  if (!visible) return null;
  return (
    <div className={styles.badge} role="alert">
      <span className={styles.icon}>⚠</span>
      <span>Percentuais desatualizados — clique Calcular para atualizar</span>
    </div>
  );
}
