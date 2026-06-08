import { useState } from 'react';
import { Button } from '@components/ui/button';
import type { AjusteEstornoStatus, AjustesEstornoFiltros } from '../types/ajusteEstorno';
import styles from './AjustesEstornoFilters.module.css';

const ALL_STATUSES: AjusteEstornoStatus[] = [
  'PENDENTE_APLICACAO',
  'PREVISTO',
  'APLICADO',
  'CANCELADO',
  'IGNORADO_SEM_DISTRIBUICAO',
  'PROCESSO_CRIADO_DESATUALIZADO',
  'ERRO_INTEGRIDADE',
];

const STATUS_LABEL: Record<AjusteEstornoStatus, string> = {
  PENDENTE_APLICACAO: 'Pendente aplicação',
  PREVISTO: 'Previsto',
  APLICADO: 'Aplicado',
  CANCELADO: 'Cancelado',
  IGNORADO_SEM_DISTRIBUICAO: 'Ignorado (sem distribuição)',
  PROCESSO_CRIADO_DESATUALIZADO: 'Processo desatualizado',
  ERRO_INTEGRIDADE: 'Erro de integridade',
};

interface AjustesEstornoFiltersProps {
  value: AjustesEstornoFiltros;
  onChange: (filtros: AjustesEstornoFiltros) => void;
}

export function AjustesEstornoFilters({ value, onChange }: AjustesEstornoFiltersProps) {
  const [rubrica, setRubrica] = useState(value.rubrica ?? '');
  const [periodoOrigem, setPeriodoOrigem] = useState(value.periodoOrigem ?? '');
  const [pagamentoId, setPagamentoId] = useState(value.pagamentoId ?? '');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<AjusteEstornoStatus>>(
    new Set(value.status ?? []),
  );

  const toggleStatus = (status: AjusteEstornoStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleApply = () => {
    onChange({
      rubrica: rubrica.trim() || undefined,
      periodoOrigem: periodoOrigem.trim() || undefined,
      pagamentoId: pagamentoId.trim() || undefined,
      status: selectedStatuses.size > 0 ? [...selectedStatuses] : undefined,
      page: 1,
    });
  };

  const handleClear = () => {
    setRubrica('');
    setPeriodoOrigem('');
    setPagamentoId('');
    setSelectedStatuses(new Set());
    onChange({ page: 1 });
  };

  return (
    <div className={styles.filters} role="search" aria-label="Filtros de ajustes por estorno">
      <div className={styles.inputs}>
        <div className={styles.field}>
          <label htmlFor="filtro-rubrica" className={styles.label}>Rubrica</label>
          <input
            id="filtro-rubrica"
            className={styles.input}
            type="text"
            placeholder="Ex: RADIO"
            value={rubrica}
            onChange={(e) => setRubrica(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="filtro-periodo" className={styles.label}>Período origem</label>
          <input
            id="filtro-periodo"
            className={styles.input}
            type="text"
            placeholder="YYYY-MM"
            pattern="\d{4}-\d{2}"
            value={periodoOrigem}
            onChange={(e) => setPeriodoOrigem(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="filtro-pagamento" className={styles.label}>Pagamento ID</label>
          <input
            id="filtro-pagamento"
            className={styles.input}
            type="text"
            placeholder="UUID"
            value={pagamentoId}
            onChange={(e) => setPagamentoId(e.target.value)}
          />
        </div>
      </div>

      <fieldset className={styles.statusFieldset}>
        <legend className={styles.label}>Status</legend>
        <div className={styles.checkboxGroup}>
          {ALL_STATUSES.map((s) => (
            <label key={s} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedStatuses.has(s)}
                onChange={() => toggleStatus(s)}
              />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="button" size="sm" onClick={handleApply}>
          Filtrar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          Limpar
        </Button>
      </div>
    </div>
  );
}
