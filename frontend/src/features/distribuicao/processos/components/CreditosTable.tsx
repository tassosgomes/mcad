import { Badge } from '@components/ui/badge';
import type { CreditoCalculo, PaginationMetadata } from '../types/calculo';
import {
  formatCategoria,
  formatCurrency,
  formatDecimal,
  formatPercentage,
  formatStatusCredito,
  formatSubcategoria,
} from '../utils/calculoFormatters';
import styles from './CreditosTable.module.css';

interface CreditosTableProps {
  creditos: CreditoCalculo[];
  metadata: PaginationMetadata;
  onPageChange: (page: number) => void;
}

function shortId(id: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

export function CreditosTable({ creditos, metadata, onPageChange }: CreditosTableProps) {
  const currentPage = metadata.page + 1;
  const from = metadata.total === 0 ? 0 : metadata.page * metadata.size + 1;
  const to = Math.min((metadata.page + 1) * metadata.size, metadata.total);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titular</th>
              <th>Obra</th>
              <th>Fonograma</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>% aplicado</th>
              <th>Valor da obra</th>
              <th>Crédito</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {creditos.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={9}>
                  Nenhum crédito encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              creditos.map((credito) => (
                <tr key={credito.id}>
                  <td>
                    <strong>{credito.titularNome}</strong>
                    <span>{shortId(credito.titularId)}</span>
                  </td>
                  <td>
                    <strong>{credito.obraTitulo}</strong>
                    <span>{shortId(credito.obraId)} · {formatDecimal(credito.pontosObra)} pts</span>
                  </td>
                  <td className={styles.mono}>{shortId(credito.fonogramaId)}</td>
                  <td>
                    <Badge variant={credito.categoria === 'AUTORAL' ? 'accent' : 'secondary'}>
                      {formatCategoria(credito.categoria)}
                    </Badge>
                  </td>
                  <td>{formatSubcategoria(credito.subcategoriaConexa)}</td>
                  <td className={styles.numeric}>{formatPercentage(credito.percentualAplicado)}</td>
                  <td className={styles.numeric}>{formatCurrency(credito.valorObra)}</td>
                  <td className={styles.creditValue}>{formatCurrency(credito.valorCredito)}</td>
                  <td>
                    <Badge variant="success">{formatStatusCredito(credito.status)}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span>
          Mostrando <strong>{from}-{to}</strong> de <strong>{metadata.total}</strong>
        </span>
        <div className={styles.paginationActions}>
          <button
            type="button"
            onClick={() => onPageChange(metadata.page - 1)}
            disabled={metadata.page <= 0}
          >
            Anterior
          </button>
          <span>{currentPage} / {Math.max(metadata.totalPages, 1)}</span>
          <button
            type="button"
            onClick={() => onPageChange(metadata.page + 1)}
            disabled={currentPage >= metadata.totalPages}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
