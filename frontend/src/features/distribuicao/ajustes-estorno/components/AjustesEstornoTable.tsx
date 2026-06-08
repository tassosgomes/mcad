import { formatCurrency, formatDateTime } from '../../processos/utils/calculoFormatters';
import { AjusteEstornoStatusBadge } from './AjusteEstornoStatusBadge';
import type { AjusteEstornoResumo } from '../types/ajusteEstorno';
import styles from './AjustesEstornoTable.module.css';

interface AjustesEstornoTableProps {
  items: AjusteEstornoResumo[];
  onRowClick: (id: string) => void;
}

function shortId(id: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : '-';
}

export function AjustesEstornoTable({ items, onRowClick }: AjustesEstornoTableProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table} aria-label="Ajustes por estorno">
          <thead>
            <tr>
              <th>Pagamento</th>
              <th>Rubrica</th>
              <th>Período origem</th>
              <th>Status</th>
              <th>Valor bruto</th>
              <th>Valor líquido</th>
              <th>Valor aplicado</th>
              <th>Justificativa</th>
              <th>Recebido em</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={9}>
                  Nenhum ajuste encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={styles.row}
                  onClick={() => onRowClick(item.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Detalhe do ajuste ${shortId(item.id)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(item.id);
                    }
                  }}
                >
                  <td className={styles.mono}>{shortId(item.pagamentoId)}</td>
                  <td>
                    <strong>{item.rubrica.sigla}</strong>
                    <span>{item.rubrica.nome}</span>
                  </td>
                  <td className={styles.mono}>{item.periodoOrigem}</td>
                  <td>
                    <AjusteEstornoStatusBadge status={item.status} />
                  </td>
                  <td className={styles.negativeValue}>{formatCurrency(item.valorEstornadoBruto)}</td>
                  <td className={styles.negativeValue}>{formatCurrency(item.valorAjusteLiquido)}</td>
                  <td className={styles.mono}>
                    {item.valorAplicado !== null ? formatCurrency(item.valorAplicado) : '—'}
                  </td>
                  <td
                    className={styles.justificativa}
                    title={item.justificativa}
                  >
                    {item.justificativa}
                  </td>
                  <td className={styles.mono}>{formatDateTime(item.recebidoEm)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
