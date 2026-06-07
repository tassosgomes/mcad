import styles from './TitularesDemonstrativoTable.module.css';
import type { TitularesDemonstrativoPage } from '../types';
import { formatBRL, formatNumberBR } from '../utils/format';

interface Props {
  data?: TitularesDemonstrativoPage;
  filtroNome: string;
  onFiltroNomeChange: (value: string) => void;
  onTitularClick: (titularId: string) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export function TitularesDemonstrativoTable({
  data,
  filtroNome,
  onFiltroNomeChange,
  onTitularClick,
  page,
  onPageChange,
}: Props) {
  const totalElements = data?.metadata.total ?? 0;
  const showSearch = totalElements >= 5 || filtroNome.length > 0;

  return (
    <div className={styles.container}>
      {showSearch && (
        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="Buscar por nome do titular..."
            value={filtroNome}
            onChange={(e) => onFiltroNomeChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Total a Receber</th>
              <th>Total Retido</th>
              <th>Total Liberado</th>
              <th>Qtd. Obras</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr
                key={item.titularId}
                onClick={() => onTitularClick(item.titularId)}
                className={styles.row}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTitularClick(item.titularId);
                  }
                }}
              >
                <td className={styles.nome}>{item.titularNome}</td>
                <td className={styles.valor}>{formatBRL(item.totalAReceber)}</td>
                <td className={styles.valor}>{formatBRL(item.totalRetido)}</td>
                <td className={styles.valor}>{formatBRL(item.totalLiberado)}</td>
                <td className={styles.valor}>{formatNumberBR(item.quantidadeObras)}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  Nenhum titular encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.metadata.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </button>
          <span>
            Pagina {page + 1} de {data.metadata.totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= data.metadata.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
