import styles from './Pagination.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationData {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, size, total, totalPages } = pagination;
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, total);

  return (
    <div className={styles.wrapper}>
      <span className={styles.info}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong>
      </span>
      <div className={styles.controls}>
        <button
          className={styles.btn}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
          aria-label="Página anterior"
          type="button"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <span className={styles.pageIndicator}>
          {page + 1} / {totalPages}
        </span>
        <button
          className={styles.btn}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Próxima página"
          type="button"
        >
          Próximo
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
