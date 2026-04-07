import { useEffect, useState } from 'react';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { useDebounce } from '@hooks/useDebounce';
import type { LicencaFiltros, StatusLicenca } from '../types/licenca';
import styles from './LicencasFilters.module.css';

interface LicencasFiltersProps {
  filtros: LicencaFiltros;
  onChange: (filtros: Partial<LicencaFiltros>) => void;
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
  { value: 'ATIVA' as StatusLicenca, label: 'Ativa' },
  { value: 'SUSPENSA' as StatusLicenca, label: 'Suspensa' },
  { value: 'ENCERRADA' as StatusLicenca, label: 'Encerrada' },
];

const VIGENTE_OPTIONS = [
  { value: 'true', label: 'Vigentes' },
  { value: 'false', label: 'Expiradas' },
];

export function LicencasFilters({ filtros, onChange, onReset }: LicencasFiltersProps) {
  const [razaoSocialDraft, setRazaoSocialDraft] = useState(filtros.razaoSocial ?? '');
  const razaoSocialDebounced = useDebounce(razaoSocialDraft, 300);

  useEffect(() => {
    onChange({ razaoSocial: razaoSocialDebounced || undefined, page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razaoSocialDebounced]);

  return (
    <div className={styles.filters}>
      <TextInput
        placeholder="Buscar por razão social..."
        value={razaoSocialDraft}
        onChange={setRazaoSocialDraft}
        aria-label="Filtrar por razão social"
      />
      <Select<string>
        value={filtros.rubricaSigla ?? ''}
        onChange={(val) => onChange({ rubricaSigla: val || undefined, page: 0 })}
        options={RUBRICA_OPTIONS}
        placeholder="Todas as rubricas"
        aria-label="Filtrar por rubrica"
      />
      <Select<StatusLicenca | ''>
        value={filtros.status ?? ''}
        onChange={(val) => onChange({ status: (val as StatusLicenca) || undefined, page: 0 })}
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />
      <Select<string>
        value={filtros.vigente !== undefined ? String(filtros.vigente) : ''}
        onChange={(val) =>
          onChange({
            vigente: val === '' ? undefined : val === 'true',
            page: 0,
          })
        }
        options={VIGENTE_OPTIONS}
        placeholder="Todas as vigências"
        aria-label="Filtrar por vigência"
      />
      <Button variant="secondary" onClick={onReset} type="button" id="btn-reset-filtros">
        Limpar filtros
      </Button>
    </div>
  );
}
