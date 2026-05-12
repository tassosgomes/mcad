import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import type { VerbasFilter, StatusVerba } from '../types/verba';
import styles from './VerbasFilters.module.css';

interface VerbasFiltersProps {
  filtros: VerbasFilter;
  onChange: (filtros: Partial<VerbasFilter>) => void;
  onReset: () => void;
}

const RUBRICA_OPTIONS = [
  { value: 'RADIO', label: 'Rádio' },
  { value: 'TV_ABERTA', label: 'TV Aberta' },
  { value: 'TV_FECHADA', label: 'TV Fechada' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'SHOWS', label: 'Shows' },
  { value: 'SONORIZACAO', label: 'Sonorização' },
  { value: 'OUTROS', label: 'Outros' },
];

const STATUS_OPTIONS = [
  { value: 'ABERTA' as StatusVerba, label: 'Aberta' },
  { value: 'EM_DISTRIBUICAO' as StatusVerba, label: 'Em Distribuição' },
  { value: 'DISTRIBUIDA' as StatusVerba, label: 'Distribuída' },
];

export function VerbasFilters({ filtros, onChange, onReset }: VerbasFiltersProps) {
  return (
    <div className={styles.filters}>
      <Select<string>
        value={filtros.rubricaSigla ?? ''}
        onChange={(val) => onChange({ rubricaSigla: val || undefined, page: 0 })}
        options={RUBRICA_OPTIONS}
        placeholder="Todas as rubricas"
        aria-label="Filtrar por rubrica"
      />

      <input
        type="month"
        className={styles.monthInput}
        value={filtros.periodo ?? ''}
        onChange={(e) => onChange({ periodo: e.target.value || undefined, periodoInicio: undefined, periodoFim: undefined, page: 0 })}
        aria-label="Filtrar por período exato"
        title="Período exato"
      />

      <div className={styles.rangeGroup}>
        <input
          type="month"
          className={styles.monthInput}
          value={filtros.periodoInicio ?? ''}
          onChange={(e) => onChange({ periodoInicio: e.target.value || undefined, periodo: undefined, page: 0 })}
          aria-label="Período início"
          title="Período início"
        />
        <span className={styles.rangeSep}>até</span>
        <input
          type="month"
          className={styles.monthInput}
          value={filtros.periodoFim ?? ''}
          onChange={(e) => onChange({ periodoFim: e.target.value || undefined, periodo: undefined, page: 0 })}
          aria-label="Período fim"
          title="Período fim"
        />
      </div>

      <Select<StatusVerba | ''>
        value={filtros.status ?? ''}
        onChange={(val) => onChange({ status: (val as StatusVerba) || undefined, page: 0 })}
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />

      <Button variant="secondary" onClick={onReset} type="button" id="btn-reset-filtros-verbas">
        Limpar filtros
      </Button>
    </div>
  );
}
