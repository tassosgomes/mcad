import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Loading } from '@components/ui/loading';
import { ErrorState } from '@components/ui/error-state';
import { formatBRL } from '../../shared/utils/formatCurrency';
import { StatusBadgeVerba } from './StatusBadgeVerba';
import { useVerbasAgregado } from '../hooks/useVerbasAgregado';
import { useVerbas } from '../hooks/useVerbas';
import type { VerbasAgregadoFilter } from '../types/verba';
import styles from './VerbasAgregadoTable.module.css';

interface VerbasAgregadoTableProps {
  filtros: VerbasAgregadoFilter;
}

interface RubricaRowProps {
  rubricaSigla: string;
  rubricaNome: string;
  valorBrutoTotal: string;
  verbaLiquidaTotal: string;
  quantidadePeriodos: number;
}

function RubricaRow({ rubricaSigla, rubricaNome, valorBrutoTotal, verbaLiquidaTotal, quantidadePeriodos }: RubricaRowProps) {
  const [expanded, setExpanded] = useState(false);

  const periodosFiltros = {
    rubricaSigla,
    page: 0,
    size: 50,
    sort: '-periodo',
  };

  const { data: periodos, isLoading: periodoIsLoading } = useVerbas(periodosFiltros);

  const showPeriodos = expanded && !periodoIsLoading && periodos && periodos.data.length > 0;

  return (
    <>
      <tr
        className={`${styles.row} ${expanded ? styles.rowExpanded : ''}`}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <td className={`${styles.td} ${styles.chevronCell}`}>
          <ChevronRight
            size={16}
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          />
        </td>
        <td className={styles.td}>
          <span className={styles.chip}>{rubricaSigla}</span>
          <span className={styles.rubricaNome}>{rubricaNome}</span>
        </td>
        <td className={`${styles.td} ${styles.textRight}`}>
          <span className={styles.valor}>{formatBRL(valorBrutoTotal)}</span>
        </td>
        <td className={`${styles.td} ${styles.textRight}`}>
          <span className={styles.verbaLiquida}>{formatBRL(verbaLiquidaTotal)}</span>
        </td>
        <td className={`${styles.td} ${styles.textRight}`}>
          <span className={styles.qtd}>{quantidadePeriodos}</span>
        </td>
      </tr>

      {expanded && periodoIsLoading && (
        <tr className={styles.subRow}>
          <td colSpan={5} className={`${styles.subTd} ${styles.subLoading}`}>
            Carregando períodos...
          </td>
        </tr>
      )}

      {showPeriodos &&
        periodos.data.map((verba) => (
          <tr key={verba.id} className={styles.subRow}>
            <td className={styles.subTd} />
            <td className={`${styles.subTd} ${styles.subIndent}`}>
              <span className={styles.subMono}>{verba.periodo}</span>
            </td>
            <td className={`${styles.subTd} ${styles.textRight}`}>
              <span className={styles.subValor}>{formatBRL(verba.valorBrutoTotal)}</span>
            </td>
            <td className={`${styles.subTd} ${styles.textRight}`}>
              <span className={styles.subLiquida}>{formatBRL(verba.verbaLiquida)}</span>
            </td>
            <td className={`${styles.subTd} ${styles.textRight}`}>
              <StatusBadgeVerba status={verba.status} />
            </td>
          </tr>
        ))}
    </>
  );
}

export function VerbasAgregadoTable({ filtros }: VerbasAgregadoTableProps) {
  const { data, isLoading, error, refetch } = useVerbasAgregado(filtros);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Erro ao carregar verbas agregadas" onRetry={refetch} />;

  if (!data || data.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nenhuma verba encontrada para os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th} style={{ width: 40 }} />
            <th className={styles.th}>RUBRICA</th>
            <th className={`${styles.th} ${styles.textRight}`}>BRUTO TOTAL</th>
            <th className={`${styles.th} ${styles.textRight}`}>LÍQUIDA TOTAL</th>
            <th className={`${styles.th} ${styles.textRight}`}>PERÍODOS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((agregado) => (
            <RubricaRow
              key={agregado.rubrica.id}
              rubricaSigla={agregado.rubrica.sigla}
              rubricaNome={agregado.rubrica.nome}
              valorBrutoTotal={agregado.valorBrutoTotal}
              verbaLiquidaTotal={agregado.verbaLiquidaTotal}
              quantidadePeriodos={agregado.quantidadePeriodos}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
