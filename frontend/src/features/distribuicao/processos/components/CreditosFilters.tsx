import type { CategoriaCredito, MotivoRetencao, StatusCredito } from '../types/calculo';
import styles from './CreditosFilters.module.css';

interface CreditosFiltersValue {
  categoria: CategoriaCredito | '';
  titularId: string;
  obraId: string;
  status: StatusCredito | '';
  motivoRetencao: MotivoRetencao | '';
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

      <label className={styles.field}>
        <span>Status</span>
        <select
          value={value.status}
          onChange={(event) => onChange({ ...value, status: event.target.value as StatusCredito | '' })}
        >
          <option value="">Todos</option>
          <option value="CALCULADO">Calculado</option>
          <option value="RETIDO">Retido</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Motivo</span>
        <select
          value={value.motivoRetencao}
          onChange={(event) => onChange({ ...value, motivoRetencao: event.target.value as MotivoRetencao | '' })}
        >
          <option value="">Todos</option>
          <option value="OBRA_PENDENTE">Obra pendente</option>
          <option value="OBRA_BLOQUEADA">Obra bloqueada</option>
          <option value="TITULAR_SEM_ASSOCIACAO">Titular sem associação</option>
        </select>
      </label>
    </form>
  );
}
