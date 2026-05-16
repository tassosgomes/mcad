import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { ProcessoStatusBadge } from './ProcessoStatusBadge';
import type { Processo } from '../types/processo';
import styles from './ProcessosTable.module.css';

interface ProcessosTableProps {
  data: Processo[];
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProcessosTable({ data }: ProcessosTableProps) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhum processo encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>RUBRICA</th>
            <th className={styles.th}>PERÍODO</th>
            <th className={styles.th}>STATUS</th>
            <th className={styles.th}>VERBA LÍQUIDA</th>
            <th className={styles.th}>ANALISTA</th>
            <th className={styles.th}>CRIADO EM</th>
            <th className={`${styles.th} ${styles.textRight}`} aria-label="Ações">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
          {data.map((processo) => (
            <tr
              key={processo.id}
              className={styles.row}
              onClick={() => navigate(`/distribuicao/processos/${processo.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <td className={styles.td}>
                <span className={styles.chip}>{processo.rubrica.sigla}</span>
                <span className={styles.rubricaNome}>{processo.rubrica.nome}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono}>{processo.periodo}</span>
              </td>
              <td className={styles.td}>
                <ProcessoStatusBadge status={processo.status} />
              </td>
              <td className={styles.td}>
                <span className={styles.valor}>{formatBRL(processo.verbaLiquida)}</span>
              </td>
              <td className={styles.td}>
                <span>{processo.analistaResponsavel}</span>
              </td>
              <td className={styles.td}>
                <span className={styles.dateText}>{formatDateTime(processo.criadoEm)}</span>
              </td>
              <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                <div className={styles.actions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => navigate(`/distribuicao/processos/${processo.id}`)}
                    aria-label={`Ver detalhes do processo ${processo.rubrica.sigla} — ${processo.periodo}`}
                    title="Ver detalhes"
                    type="button"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
