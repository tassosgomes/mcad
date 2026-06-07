import styles from './DemonstrativoTitularPanel.module.css';
import type { DemonstrativoTitular } from '../types';
import { ResumoFinanceiroCards } from './ResumoFinanceiroCards';
import {
  formatBRL,
  formatPercentualBR,
  formatDateTimeBR,
  getMotivoRetencaoLabel,
} from '../utils/format';
import { Link } from 'react-router-dom';

interface Props {
  demonstrativo: DemonstrativoTitular;
}

export function DemonstrativoTitularPanel({ demonstrativo }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.titularNome}>{demonstrativo.titularNome}</h3>
        <span className={styles.meta}>
          {demonstrativo.rubricaSigla} — {demonstrativo.periodo}
        </span>
      </div>

      <ResumoFinanceiroCards resumo={demonstrativo.resumo} />

      <Section title={`Creditos do Periodo (${demonstrativo.creditosPeriodo.length})`}>
        {demonstrativo.creditosPeriodo.length === 0 ? (
          <EmptyState message="Nenhum credito calculado para este titular no periodo." />
        ) : (
          <table className={styles.sectionTable}>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Categoria</th>
                <th>Percentual</th>
                <th>Valor Obra</th>
                <th>Valor Credito</th>
              </tr>
            </thead>
            <tbody>
              {demonstrativo.creditosPeriodo.map((c, i) => (
                <tr key={i}>
                  <td>{c.obraNome}</td>
                  <td>{[c.categoria, c.subcategoria].filter(Boolean).join(' / ')}</td>
                  <td className={styles.num}>{formatPercentualBR(c.percentual)}</td>
                  <td className={styles.num}>{formatBRL(c.valorObra)}</td>
                  <td className={styles.num}>{formatBRL(c.valorCredito)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Creditos Retidos (${demonstrativo.creditosRetidos.length})`}>
        {demonstrativo.creditosRetidos.length === 0 ? (
          <EmptyState message="Nenhum credito retido para este titular no periodo." />
        ) : (
          <table className={styles.sectionTable}>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Categoria</th>
                <th>Motivo Retencao</th>
                <th>Valor Credito</th>
                <th>Retido em</th>
              </tr>
            </thead>
            <tbody>
              {demonstrativo.creditosRetidos.map((c, i) => (
                <tr key={i}>
                  <td>{c.obraNome}</td>
                  <td>{c.categoria}</td>
                  <td>
                    <span className={styles.badge}>
                      {getMotivoRetencaoLabel(c.motivoRetencao)}
                    </span>
                  </td>
                  <td className={styles.num}>{formatBRL(c.valorCredito)}</td>
                  <td>{formatDateTimeBR(c.retidoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Creditos Liberados (${demonstrativo.creditosLiberados.length})`}>
        {demonstrativo.creditosLiberados.length === 0 ? (
          <EmptyState message="Nenhum credito liberado de retencoes anteriores para este titular." />
        ) : (
          <table className={styles.sectionTable}>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Categoria</th>
                <th>Processo Origem</th>
                <th>Motivo Original</th>
                <th>Valor Credito</th>
                <th>Liberado em</th>
              </tr>
            </thead>
            <tbody>
              {demonstrativo.creditosLiberados.map((c, i) => (
                <tr key={i}>
                  <td>{c.obraNome}</td>
                  <td>{c.categoria}</td>
                  <td>
                    <Link
                      to={`/distribuicao/processos/${c.processoOrigemId}`}
                      className={styles.link}
                    >
                      {c.processoOrigemId.slice(0, 8)}...
                    </Link>
                  </td>
                  <td>{getMotivoRetencaoLabel(c.motivoOriginal)}</td>
                  <td className={styles.num}>{formatBRL(c.valorCredito)}</td>
                  <td>{formatDateTimeBR(c.liberadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Ajustes por Estorno (${demonstrativo.ajustesEstorno.length})`}>
        <EmptyState message="Nenhum ajuste por estorno neste processo." />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className={styles.emptyState}>{message}</div>;
}
