import { Link } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import type { ExecucaoPendente } from '../types/pendente';
import styles from './PendentesTable.module.css';

interface PendentesTableProps {
  data: ExecucaoPendente[];
  sort: string;
  onSortChange: (sort: string) => void;
  onResolve: (execucao: ExecucaoPendente) => void;
}

export function PendentesTable({ data, sort, onSortChange, onResolve }: PendentesTableProps) {
  const toggleSort = (field: string) => {
    if (sort === field) {
      onSortChange(`-${field}`);
    } else {
      onSortChange(field);
    }
  };

  const getSortIcon = (field: string) => {
    if (sort === field) return ' ↑';
    if (sort === `-${field}`) return ' ↓';
    return '';
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR').format(d);
  };

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma execução pendente encontrada.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th onClick={() => toggleSort('criadoEm')} className={styles.thSortable}>
              Recebido Em{getSortIcon('criadoEm')}
            </th>
            <th onClick={() => toggleSort('captacao')} className={styles.thSortable}>
              Captação / Rubrica{getSortIcon('captacao')}
            </th>
            <th onClick={() => toggleSort('isrc')} className={styles.thSortable}>
              ISRC / Título{getSortIcon('isrc')}
            </th>
            <th className={styles.th}>Qtd/Horário</th>
            <th className={`${styles.th} ${styles.actionsCell}`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((pendente) => (
            <tr key={pendente.id} className={styles.row}>
              <td className={styles.td}>
                {new Date(pendente.criadoEm).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </td>
              <td className={styles.td}>
                <div className={styles.titleWrapper}>
                  <Link to={`/identificacao/captacoes/${pendente.captacaoId}`} className={styles.captacaoLink}>
                    {pendente.captacaoRubrica} — {formatDate(pendente.captacaoPeriodo)}
                  </Link>
                  <span className={styles.subtitle}>Resp: {pendente.captacaoAnalistaResponsavel}</span>
                  {pendente.captacaoStatus !== 'ABERTA' && (
                    <Badge variant="warning">{pendente.captacaoStatus}</Badge>
                  )}
                </div>
              </td>
              <td className={styles.td}>
                <div className={styles.titleWrapper}>
                  {pendente.obraTitulo ? (
                    <span className={styles.title}>{pendente.obraTitulo}</span>
                  ) : (
                    <span className={styles.title} style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Título não identificado</span>
                  )}
                  <span className={styles.subtitle}>
                    {pendente.fonogramaIsrc ? `ISRC: ${pendente.fonogramaIsrc}` : pendente.obraIswc ? `ISWC: ${pendente.obraIswc}` : 'Sem código oficial'}
                  </span>
                </div>
              </td>
              <td className={styles.td}>
                <div className={styles.titleWrapper}>
                  <span className={styles.title}>{pendente.quantidade}x</span>
                  <span className={styles.subtitle}>{pendente.inicio || '-'} às {pendente.fim || '-'}</span>
                </div>
              </td>
              <td className={`${styles.td} ${styles.actionsCell}`}>
                <Button 
                  size="sm" 
                  onClick={() => onResolve(pendente)}
                  disabled={pendente.captacaoStatus !== 'ABERTA'}
                  title={pendente.captacaoStatus !== 'ABERTA' ? 'Captação não está ABERTA' : 'Resolver individualmente'}
                >
                  Resolver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
