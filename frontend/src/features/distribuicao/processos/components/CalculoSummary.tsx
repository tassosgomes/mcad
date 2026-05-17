import type { CalculoProcessoResponse } from '../types/calculo';
import {
  formatCurrency,
  formatDateTime,
  formatDecimal,
} from '../utils/calculoFormatters';
import { ProcessoStatusBadge } from './ProcessoStatusBadge';
import styles from './CalculoSummary.module.css';

interface CalculoSummaryProps {
  calculo: CalculoProcessoResponse;
}

interface Metric {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: 'warning';
}

export function CalculoSummary({ calculo }: CalculoSummaryProps) {
  const { resumo } = calculo;
  const metrics: Metric[] = [
    { label: 'Verba Líquida', value: formatCurrency(resumo.verbaLiquida), highlight: true },
    { label: 'Execuções', value: String(resumo.totalExecucoes ?? 0) },
    { label: 'Pontos', value: formatDecimal(resumo.totalPontos) },
    { label: 'Obras', value: String(resumo.totalObras ?? 0) },
    { label: 'Créditos', value: String(resumo.totalCreditos ?? 0) },
    { label: 'Total calculado', value: formatCurrency(resumo.valorTotalCalculado), highlight: true },
    { label: 'Créditos retidos', value: String(resumo.totalCreditosRetidos ?? 0), tone: 'warning' },
    { label: 'Valor retido', value: formatCurrency(resumo.valorTotalRetido), tone: 'warning' },
  ];

  return (
    <section className={styles.section} aria-labelledby="calculo-summary-title">
      <div className={styles.header}>
        <div>
          <h2 id="calculo-summary-title" className={styles.title}>Resumo do cálculo</h2>
          <div className={styles.meta}>
            <span className={styles.rubrica}>{calculo.rubricaSigla}</span>
            <span>{calculo.periodo}</span>
            <ProcessoStatusBadge status={calculo.status} />
          </div>
        </div>
        <div className={styles.timestamp}>
          <span className={styles.timestampLabel}>Calculado em</span>
          <span>{formatDateTime(resumo.calculadoEm)}</span>
        </div>
      </div>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.metric}>
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong
              className={[
                styles.metricValue,
                metric.highlight ? styles.metricValueHighlight : '',
                metric.tone === 'warning' ? styles.metricValueWarning : '',
              ].join(' ')}
            >
              {metric.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
