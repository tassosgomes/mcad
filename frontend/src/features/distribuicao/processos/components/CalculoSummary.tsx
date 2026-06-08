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
  tone?: 'warning' | 'success';
}

export function CalculoSummary({ calculo }: CalculoSummaryProps) {
  const { resumo } = calculo;
  const isFinalizado = calculo.status === 'FINALIZADO';
  const metrics: Metric[] = [
    { label: 'Verba Líquida', value: formatCurrency(resumo.verbaLiquida), highlight: true },
    { label: 'Execuções', value: String(resumo.totalExecucoes ?? 0) },
    { label: 'Pontos', value: formatDecimal(resumo.totalPontos) },
    { label: 'Obras', value: String(resumo.totalObras ?? 0) },
    { label: 'Créditos', value: String(resumo.totalCreditos ?? 0) },
    { label: 'Total calculado', value: formatCurrency(resumo.valorTotalCalculado), highlight: true },
    { label: 'Créditos retidos', value: String(resumo.totalCreditosRetidos ?? 0), tone: 'warning' },
    { label: 'Valor retido', value: formatCurrency(resumo.valorTotalRetido), tone: 'warning' },
    {
      label: isFinalizado ? 'Créditos liberados' : 'Créditos a liberar',
      value: String(resumo.totalCreditosRetidosLiberados ?? 0),
      tone: isFinalizado ? 'success' : 'warning',
    },
    {
      label: isFinalizado ? 'Valor liberado' : 'Valor a liberar',
      value: formatCurrency(resumo.valorTotalRetidosLiberados),
      tone: isFinalizado ? 'success' : 'warning',
    },
    ...(resumo.totalAjustesEstorno !== null
      ? [
          {
            label: 'Ajustes por estorno',
            value: String(resumo.totalAjustesEstorno),
            tone: 'warning' as const,
          },
          {
            label: 'Valor ajustado',
            value: formatCurrency(resumo.valorTotalAjustesEstorno),
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(resumo.valorLiquidoDemonstravel !== null
      ? [
          {
            label: 'Valor demonstrável',
            value: formatCurrency(resumo.valorLiquidoDemonstravel),
            highlight: true,
          },
        ]
      : []),
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
                metric.tone === 'success' ? styles.metricValueSuccess : '',
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
