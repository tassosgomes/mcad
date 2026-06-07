import styles from './ResumoFinanceiroCards.module.css';
import { formatBRL } from '../utils/format';
import type { ResumoFinanceiro } from '../types';

interface Props {
  resumo: ResumoFinanceiro;
}

export function ResumoFinanceiroCards({ resumo }: Props) {
  return (
    <div className={styles.cards}>
      <div className={`${styles.card} ${styles.receber}`}>
        <span className={styles.label}>Total a Receber</span>
        <span className={styles.value}>{formatBRL(resumo.totalAReceber)}</span>
      </div>
      <div className={`${styles.card} ${styles.calculado}`}>
        <span className={styles.label}>Total Calculado</span>
        <span className={styles.value}>{formatBRL(resumo.totalCalculado)}</span>
      </div>
      <div className={`${styles.card} ${styles.retido}`}>
        <span className={styles.label}>Total Retido</span>
        <span className={styles.value}>{formatBRL(resumo.totalRetido)}</span>
      </div>
      <div className={`${styles.card} ${styles.liberado}`}>
        <span className={styles.label}>Total Liberado</span>
        <span className={styles.value}>{formatBRL(resumo.totalLiberado)}</span>
      </div>
      <div className={`${styles.card} ${styles.ajuste}`}>
        <span className={styles.label}>Total Ajustes</span>
        <span className={styles.value}>{formatBRL(resumo.totalAjustesEstorno)}</span>
      </div>
    </div>
  );
}
