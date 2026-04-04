import { useState, useEffect } from 'react';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { FormField } from '@components/ui/form-field';
import type { PendenteListFilters } from '../types/pendente';
import { useRubricas } from '../../captacoes/hooks/useRubricas';
import { useDebounce } from '@hooks/useDebounce';
import styles from './PendentesFilters.module.css';

interface PendentesFiltersProps {
  filtros: PendenteListFilters;
  onChange: (filtros: PendenteListFilters) => void;
}

export function PendentesFilters({ filtros, onChange }: PendentesFiltersProps) {
  const { data: rubricas, isLoading: isLoadingRubricas } = useRubricas();
  const [qDraft, setQDraft] = useState(filtros.q || '');
  const [captacaoDraft, setCaptacaoDraft] = useState(filtros.captacaoId || '');

  const qDebounced = useDebounce(qDraft, 300);
  const captacaoDebounced = useDebounce(captacaoDraft, 300);

  useEffect(() => {
    if (qDebounced !== (filtros.q || '')) {
      onChange({ ...filtros, q: qDebounced || undefined, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  useEffect(() => {
    if (captacaoDebounced !== (filtros.captacaoId || '')) {
      onChange({ ...filtros, captacaoId: captacaoDebounced || undefined, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captacaoDebounced]);

  const handleChange = (key: keyof PendenteListFilters, value: string) => {
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

      <FormField label="ID Captação">
        <TextInput
          id="filtro-captacao"
          value={captacaoDraft}
          onChange={(val) => setCaptacaoDraft(val)}
          placeholder="UUID da Captação..."
        />
      </FormField>

      <FormField label="ISRC / ISWC / Título">
        <TextInput
          id="filtro-busca"
          value={qDraft}
          onChange={(val) => setQDraft(val)}
          placeholder="Buscar execução..."
        />
      </FormField>
    </div>
  );
}
