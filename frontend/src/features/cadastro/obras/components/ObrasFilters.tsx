import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { useDebounce } from '@hooks/useDebounce';
import { useEffect, useState } from 'react';
import type { ObraFiltros, ObraStatus, ObraTipo } from '../types/obra';
import styles from './ObrasFilters.module.css';

interface ObrasFiltersProps {
  filtros: ObraFiltros;
  onChange: (filtros: ObraFiltros) => void;
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE' as ObraStatus, label: 'Pendente' },
  { value: 'LIBERADO' as ObraStatus, label: 'Liberado' },
  { value: 'BLOQUEADO' as ObraStatus, label: 'Bloqueado' },
  { value: 'DOMINIO_PUBLICO' as ObraStatus, label: 'Domínio Público' },
  { value: 'DEPURADA' as ObraStatus, label: 'Depurada' },
];

const TIPO_OPTIONS = [
  { value: 'MUSICAL' as ObraTipo, label: 'Musical' },
  { value: 'LITEROMUSICAL' as ObraTipo, label: 'Literomusical' },
  { value: 'VERSAO' as ObraTipo, label: 'Versão' },
  { value: 'POT_POURRI' as ObraTipo, label: 'Pot-pourri' },
];

export function ObrasFilters({ filtros, onChange }: ObrasFiltersProps) {
  const [tituloDraft, setTituloDraft] = useState(filtros.titulo ?? '');
  const [iswcDraft, setIswcDraft] = useState(filtros.iswc ?? '');
  const [generoDraft, setGeneroDraft] = useState(filtros.genero ?? '');

  const tituloDebouncado = useDebounce(tituloDraft, 300);
  const iswcDebouncado = useDebounce(iswcDraft, 300);
  const generoDebouncado = useDebounce(generoDraft, 300);

  useEffect(() => {
    onChange({ ...filtros, titulo: tituloDebouncado || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tituloDebouncado]);

  useEffect(() => {
    onChange({ ...filtros, iswc: iswcDebouncado || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iswcDebouncado]);

  useEffect(() => {
    onChange({ ...filtros, genero: generoDebouncado || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generoDebouncado]);

  return (
    <div className={styles.filters}>
      <TextInput
        placeholder="Buscar por título..."
        value={tituloDraft}
        onChange={setTituloDraft}
        aria-label="Filtrar por título"
      />
      <TextInput
        placeholder="ISWC"
        value={iswcDraft}
        onChange={setIswcDraft}
        mono
        aria-label="Filtrar por ISWC"
      />
      <Select<ObraTipo | ''>
        value={filtros.tipo ?? ''}
        onChange={(val) => onChange({ ...filtros, tipo: (val as ObraTipo) || undefined, page: 1 })}
        options={TIPO_OPTIONS}
        placeholder="Todos os tipos"
        aria-label="Filtrar por tipo"
      />
      <Select<ObraStatus | ''>
        value={filtros.status ?? ''}
        onChange={(val) =>
          onChange({ ...filtros, status: (val as ObraStatus) || undefined, page: 1 })
        }
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />
      <TextInput
        placeholder="Buscar por gênero..."
        value={generoDraft}
        onChange={setGeneroDraft}
        aria-label="Filtrar por gênero"
      />
    </div>
  );
}
