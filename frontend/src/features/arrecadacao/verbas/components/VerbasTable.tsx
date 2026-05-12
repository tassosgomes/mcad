import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { Pagination } from '@components/ui/pagination';
import { formatBRL } from '../../shared/utils/formatCurrency';
import { StatusBadgeVerba } from './StatusBadgeVerba';
import { useVerbas } from '../hooks/useVerbas';
import type { VerbasFilter } from '../types/verba';
import styles from './VerbasTable.module.css';

interface VerbasTableProps {
  filtros: VerbasFilter;
  onPageChange: (page: number) => void;
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-');
  return `${month}/${year}`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VerbasTable({ filtros, onPageChange }: VerbasTableProps) {
  const { data, isLoading, error, refetch } = useVerbas(filtros);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Erro ao carregar verbas" onRetry={refetch} />;

  if (!data || data.data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma verba encontrada para os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>RUBRICA</th>
              <th className={styles.th}>PERÍODO</th>
              <th className={`${styles.th} ${styles.textRight}`}>VALOR BRUTO</th>
              <th className={`${styles.th} ${styles.textRight}`}>DED. ECAD</th>
              <th className={`${styles.th} ${styles.textRight}`}>DED. ASSOC.</th>
              <th className={`${styles.th} ${styles.textRight}`}>VERBA LÍQUIDA</th>
              <th className={`${styles.th} ${styles.textRight}`}>QTD PAG.</th>
              <th className={styles.th}>STATUS</th>
              <th className={styles.th}>ATUALIZADO EM</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((verba) => (
              <tr key={verba.id} className={styles.row}>
                <td className={styles.td}>
                  <span className={styles.chip}>{verba.rubrica.sigla}</span>
                  <span className={styles.rubricaNome}>{verba.rubrica.nome}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.mono}>{formatPeriodo(verba.periodo)}</span>
                </td>
                <td className={`${styles.td} ${styles.textRight}`}>
                  <span className={styles.valor}>{formatBRL(verba.valorBrutoTotal)}</span>
                </td>
                <td className={`${styles.td} ${styles.textRight}`}>
                  <span className={styles.deducao}>({formatBRL(verba.deducaoEcad)})</span>
                </td>
                <td className={`${styles.td} ${styles.textRight}`}>
                  <span className={styles.deducao}>({formatBRL(verba.deducaoAssociacoes)})</span>
                </td>
                <td className={`${styles.td} ${styles.textRight}`}>
                  <span className={styles.verbaLiquida}>{formatBRL(verba.verbaLiquida)}</span>
                </td>
                <td className={`${styles.td} ${styles.textRight}`}>
                  <span className={styles.qtd}>{verba.quantidadePagamentos}</span>
                </td>
                <td className={styles.td}>
                  <StatusBadgeVerba status={verba.status} />
                </td>
                <td className={styles.td}>
                  <span className={styles.atualizadoEm}>{formatDateTime(verba.atualizadoEm)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        pagination={data.pagination}
        onPageChange={onPageChange}
      />
    </>
  );
}
