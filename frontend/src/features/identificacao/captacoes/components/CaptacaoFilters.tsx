import { useState, useEffect } from 'react';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { FormField } from '@components/ui/form-field';
import type { CaptacaoFiltros } from '../types/captacao';
import { useRubricas } from '../hooks/useRubricas';
import { useDebounce } from '@hooks/useDebounce';
import styles from './CaptacaoFilters.module.css';

interface CaptacaoFiltersProps {
  filtros: CaptacaoFiltros;
  onChange: (filtros: CaptacaoFiltros) => void;
}

export function CaptacaoFilters({ filtros, onChange }: CaptacaoFiltersProps) {
  const { data: rubricas, isLoading: isLoadingRubricas } = useRubricas();
  const [responsavelDraft, setResponsavelDraft] = useState(filtros.analistaResponsavelId || '');
  const responsavelDebouncado = useDebounce(responsavelDraft, 300);

  useEffect(() => {
    if (responsavelDebouncado !== (filtros.analistaResponsavelId || '')) {
      onChange({
        ...filtros,
        analistaResponsavelId: responsavelDebouncado || undefined,
        page: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsavelDebouncado]);

  const handleChange = (key: keyof CaptacaoFiltros, value: string) => {
    onChange({
      ...filtros,
      [key]: value || undefined,
      page: 1,
    });
  };

  const rubricaOptions = rubricas?.map(r => ({
    value: r.id,
    label: r.nome,
  })) ?? [];

  return (
    <div className={styles.filtersContainer}>
      <FormField label="Rubrica">
        <Select
          value={filtros.rubricaId || ''}
          onChange={(val) => handleChange('rubricaId', val)}
          disabled={isLoadingRubricas}
          options={[{ value: '', label: 'Todas' }, ...rubricaOptions]}
        />
      </FormField>

      <div className={styles.periodoGroup}>
        <FormField label="Período Início">
          <input
            type="date"
            className={styles.dateInput}
            value={filtros.periodoInicio || ''}
            onChange={(e) => handleChange('periodoInicio', e.target.value)}
          />
        </FormField>
        <FormField label="Período Fim">
          <input
            type="date"
            className={styles.dateInput}
            value={filtros.periodoFim || ''}
            onChange={(e) => handleChange('periodoFim', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Status">
        <Select
          value={filtros.status || ''}
          onChange={(val) => handleChange('status', val)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'ABERTA', label: 'Aberta' },
            { value: 'FECHADA', label: 'Fechada' },
            { value: 'CANCELADA', label: 'Cancelada' },
          ]}
        />
      </FormField>

      <FormField label="Responsável (ID)">
        <TextInput
          id="filtro-responsavel"
          value={responsavelDraft}
          onChange={(val) => setResponsavelDraft(val)}
          placeholder="Filtrar por UUID..."
        />
      </FormField>
    </div>
  );
}
