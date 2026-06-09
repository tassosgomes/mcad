import { useState } from 'react';
import { PageHeader } from '@components/ui/page-header';
import { VerbasFilters } from '../components/VerbasFilters';
import { VerbasTable } from '../components/VerbasTable';
import { VerbasAgregadoTable } from '../components/VerbasAgregadoTable';
import type { VerbasFilter, VerbasAgregadoFilter, StatusVerba } from '../types/verba';
import styles from './VerbasPage.module.css';

type ViewMode = 'detalhada' | 'agregada';

const FILTROS_INICIAIS: VerbasFilter = {
  page: 1,
  size: 10,
  sort: '-periodo',
};

export function VerbasPage() {
  const [view, setView] = useState<ViewMode>('detalhada');
  const [filtros, setFiltros] = useState<VerbasFilter>(FILTROS_INICIAIS);

  function handleFiltrosChange(partial: Partial<VerbasFilter>) {
    setFiltros((prev) => ({ ...prev, ...partial }));
  }

  function handleReset() {
    setFiltros(FILTROS_INICIAIS);
  }

  function handlePageChange(page: number) {
    setFiltros((prev) => ({ ...prev, page }));
  }

  const agregadoFiltros: VerbasAgregadoFilter = {
    periodoInicio: filtros.periodoInicio,
    periodoFim: filtros.periodoFim,
    status: filtros.status as StatusVerba | undefined,
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Verbas"
        description="Acompanhe a arrecadação por rubrica e período. Verba líquida = 85% do valor bruto (deduções: 10% ECAD + 5% associações)."
      />

      <div className={styles.viewToggle}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${view === 'detalhada' ? styles.toggleBtnActive : ''}`}
          onClick={() => setView('detalhada')}
          aria-pressed={view === 'detalhada'}
        >
          Por Rubrica × Período
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${view === 'agregada' ? styles.toggleBtnActive : ''}`}
          onClick={() => setView('agregada')}
          aria-pressed={view === 'agregada'}
        >
          Por Rubrica (Agregado)
        </button>
      </div>

      <VerbasFilters filtros={filtros} onChange={handleFiltrosChange} onReset={handleReset} />

      {view === 'detalhada' ? (
        <VerbasTable filtros={filtros} onPageChange={handlePageChange} />
      ) : (
        <VerbasAgregadoTable filtros={agregadoFiltros} />
      )}
    </div>
  );
}
