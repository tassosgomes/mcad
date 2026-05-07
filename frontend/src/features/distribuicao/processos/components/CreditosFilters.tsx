import type { CategoriaCredito } from '../types/calculo';
import styles from './CreditosFilters.module.css';

interface CreditosFiltersValue {
  categoria: CategoriaCredito | '';
  titularId: string;
  obraId: string;
}

interface CreditosFiltersProps {
  value: CreditosFiltersValue;
  onChange: (value: CreditosFiltersValue) => void;
}

export function CreditosFilters({ value, onChange }: CreditosFiltersProps) {
  return (
    <form className={styles.filters} aria-label="Filtros de créditos">
      <label className={styles.field}>
        <span>Categoria</span>
        <select
          value={value.categoria}
          onChange={(event) => onChange({ ...value, categoria: event.target.value as CategoriaCredito | '' })}
        >
          <option value="">Todas</option>
          <option value="AUTORAL">Autoral</option>
          <option value="CONEXO">Conexo</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Titular</span>
        <input
          value={value.titularId}
          onChange={(event) => onChange({ ...value, titularId: event.target.value })}
          placeholder="ID do titular"
        />
      </label>

      <label className={styles.field}>
        <span>Obra</span>
        <input
          value={value.obraId}
          onChange={(event) => onChange({ ...value, obraId: event.target.value })}
          placeholder="ID da obra"
        />
      </label>
    </form>
  );
}
