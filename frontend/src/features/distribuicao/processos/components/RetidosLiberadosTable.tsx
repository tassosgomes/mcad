import { Badge } from '@components/ui/badge';
import type { BadgeVariant } from '@components/ui/badge';
import type { RetidoLiberadoItem, StatusLiberacaoCredito } from '../types/calculo';
import {
  formatCategoria,
  formatCurrency,
  formatDateTime,
  formatMotivoRetencao,
  formatStatusLiberacao,
  formatSubcategoria,
} from '../utils/calculoFormatters';
import styles from './RetidosLiberadosTable.module.css';

interface RetidosLiberadosTableProps {
  items: RetidoLiberadoItem[];
}

const STATUS_VARIANT: Record<StatusLiberacaoCredito, BadgeVariant> = {
  PREVISTA: 'warning',
  EFETIVADA: 'success',
  CANCELADA: 'muted',
};

function shortId(id: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

function optionalDateTime(value: string | null): string {
  return value ? formatDateTime(value) : '-';
}

export function RetidosLiberadosTable({ items }: RetidosLiberadosTableProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Período origem</th>
              <th>Titular</th>
              <th>Obra</th>
              <th>Fonograma</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Motivo original</th>
              <th>Status</th>
              <th>Retido em</th>
              <th>Avaliado / efetivado</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={10}>
                  Nenhum crédito retido previsto para liberação.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.liberacaoId}>
                  <td className={styles.mono}>{item.periodoOrigem}</td>
                  <td>
                    <strong>{item.titularNome}</strong>
                    <span>{shortId(item.titularId)}</span>
                  </td>
                  <td>
                    <strong>{item.obraTitulo}</strong>
                    <span>{shortId(item.obraId)}</span>
                  </td>
                  <td className={styles.mono}>{shortId(item.fonogramaId)}</td>
                  <td>
                    <Badge variant={item.categoria === 'AUTORAL' ? 'accent' : 'secondary'}>
                      {formatCategoria(item.categoria)}
                    </Badge>
                    <span>{formatSubcategoria(item.subcategoriaConexa)}</span>
                  </td>
                  <td className={styles.creditValue}>{formatCurrency(item.valorLiberado)}</td>
                  <td>{formatMotivoRetencao(item.motivoRetencaoOriginal)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {formatStatusLiberacao(item.status)}
                    </Badge>
                  </td>
                  <td className={styles.mono}>{formatDateTime(item.retidoEm)}</td>
                  <td className={styles.mono}>
                    <span>{formatDateTime(item.avaliadoEm)}</span>
                    <span>{optionalDateTime(item.efetivadoEm)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
