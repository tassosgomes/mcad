import { useState, useEffect } from 'react';
import type { FonogramaFiltros } from '../types/fonograma';
import { Search, X } from 'lucide-react';
import styles from './FonogramasFilters.module.css';

interface FonogramasFiltersProps {
  filters: FonogramaFiltros;
  onChange: (filters: Partial<FonogramaFiltros>) => void;
  onReset: () => void;
}

export function FonogramasFilters({ filters, onChange, onReset }: FonogramasFiltersProps) {
  const [isrc, setIsrc] = useState(filters.isrc || '');
  const [obraTitulo, setObraTitulo] = useState(filters.obraTitulo || '');
  const [pais, setPais] = useState(filters.pais || '');
  const [codigo, setCodigo] = useState(filters.codigo?.toString() || '');

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange({ isrc: isrc || undefined, page: 1 });
    }, 400);
    return () => clearTimeout(handler);
  }, [isrc]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const parsed = codigo ? parseInt(codigo, 10) : undefined;
      onChange({ codigo: isNaN(parsed as number) ? undefined : parsed, page: 1 });
    }, 400);
    return () => clearTimeout(handler);
  }, [codigo]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange({ obraTitulo: obraTitulo || undefined, page: 1 });
    }, 400);
    return () => clearTimeout(handler);
  }, [obraTitulo]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange({ pais: pais || undefined, page: 1 });
    }, 400);
    return () => clearTimeout(handler);
  }, [pais]);

  useEffect(() => {
    setIsrc(filters.isrc || '');
    setObraTitulo(filters.obraTitulo || '');
    setPais(filters.pais || '');
    setCodigo(filters.codigo?.toString() || '');
  }, [filters.isrc, filters.obraTitulo, filters.pais, filters.codigo]);

  const hasActiveFilters = !!(filters.isrc || filters.obraTitulo || filters.status || filters.pais || filters.codigo);

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.inputWrapper}>
        <Search size={16} className={styles.icon} />
        <input
          type="text"
          className={`${styles.input} ${styles.mono}`}
          placeholder="Buscar por ISRC..."
          aria-label="Filtrar por ISRC"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
        />
      </div>

      <div className={styles.inputWrapper}>
        <Search size={16} className={styles.icon} />
        <input
          type="number"
          className={`${styles.input} ${styles.mono}`}
          placeholder="Código (Ex: 67494)"
          aria-label="Filtrar por código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </div>

      <div className={styles.inputWrapper}>
        <Search size={16} className={styles.icon} />
        <input
          type="text"
          className={styles.input}
          placeholder="Buscar obra musical..."
          aria-label="Filtrar por obra musical"
          value={obraTitulo}
          onChange={(e) => setObraTitulo(e.target.value)}
        />
      </div>

      <select
        className={styles.select}
        value={filters.status || ''}
        onChange={(e) => onChange({ status: e.target.value || undefined, page: 1 })}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os Status</option>
        <option value="Pendente_Validacao">Pendente Validação</option>
        <option value="Pendente_Documentacao">Pendente Documentação</option>
        <option value="Liberado">Liberado</option>
        <option value="Depurado">Depurado</option>
      </select>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          placeholder="País (ex: BR)..."
          aria-label="Filtrar por país de origem"
          value={pais}
          onChange={(e) => setPais(e.target.value)}
        />
      </div>

      {hasActiveFilters && (
        <button className={styles.resetBtn} onClick={onReset} type="button">
          <X size={14} /> Limpar
        </button>
      )}
    </div>
  );
}
