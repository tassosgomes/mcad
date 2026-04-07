import { useEffect, useState } from 'react';
import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { useDebounce } from '@hooks/useDebounce';
import type { PagamentoFiltros, StatusPagamento } from '../types/pagamento';
import styles from './PagamentosFilters.module.css';

interface PagamentosFiltersProps {
  filtros: PagamentoFiltros;
  onChange: (filtros: Partial<PagamentoFiltros>) => void;
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
  { value: 'CONFIRMADO' as StatusPagamento, label: 'Confirmado' },
  { value: 'ESTORNADO' as StatusPagamento, label: 'Estornado' },
];

export function PagamentosFilters({ filtros, onChange, onReset }: PagamentosFiltersProps) {
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
      <input
        type="month"
        className={styles.monthInput}
        value={filtros.periodo ?? ''}
        onChange={(e) => onChange({ periodo: e.target.value || undefined, page: 0 })}
        aria-label="Filtrar por período"
        placeholder="Período"
      />
      <Select<StatusPagamento | ''>
        value={filtros.status ?? ''}
        onChange={(val) => onChange({ status: (val as StatusPagamento) || undefined, page: 0 })}
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />
      <Button variant="secondary" onClick={onReset} type="button" id="btn-reset-filtros-pagamentos">
        Limpar filtros
      </Button>
    </div>
  );
}
