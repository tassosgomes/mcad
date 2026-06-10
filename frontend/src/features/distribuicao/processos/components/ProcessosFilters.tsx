import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { useRubricas } from '../../rubricas/hooks/useRubricas';
import type { ProcessoFiltros, StatusProcesso } from '../types/processo';
import styles from './ProcessosFilters.module.css';

interface ProcessosFiltersProps {
  filtros: ProcessoFiltros;
  onChange: (partial: Partial<ProcessoFiltros>) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { value: StatusProcesso; label: string }[] = [
  { value: 'CRIADO', label: 'Criado' },
  { value: 'CALCULADO', label: 'Calculado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function ProcessosFilters({ filtros, onChange, onClear }: ProcessosFiltersProps) {
  const { data: rubricas } = useRubricas();

  const rubricaOptions = (rubricas ?? []).map((r) => ({
    value: r.sigla,
    label: `${r.sigla} — ${r.nome}`,
  }));

  return (
    <div className={styles.filters}>
      <Select<string>
        value={filtros.rubrica ?? ''}
        onChange={(val) => onChange({ rubrica: val || undefined, page: 1 })}
        options={rubricaOptions}
        placeholder="Todas as rubricas"
        aria-label="Filtrar por rubrica"
      />

      <input
        type="month"
        className={styles.monthInput}
        value={filtros.periodo ?? ''}
        onChange={(e) => onChange({ periodo: e.target.value || undefined, page: 1 })}
        aria-label="Filtrar por período"
        placeholder="Período"
      />

      <Select<string>
        value={filtros.status ?? ''}
        onChange={(val) => onChange({ status: val || undefined, page: 1 })}
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />

      <Button
        className={styles.clearButton}
        variant="secondary"
        onClick={onClear}
        type="button"
        id="btn-reset-filtros-processos"
      >
        Limpar filtros
      </Button>
    </div>
  );
}
