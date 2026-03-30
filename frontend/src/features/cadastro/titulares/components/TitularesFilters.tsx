import { TextInput } from '@components/ui/text-input';
import { Select } from '@components/ui/select';
import { useAssociacoes } from '../../associacoes/hooks/useAssociacoes';
import { useDebounce } from '@hooks/useDebounce';
import { useEffect, useState } from 'react';
import type { TitularFiltros, TitularStatus } from '../types/titular';
import styles from './TitularesFilters.module.css';

interface TitularesFiltersProps {
  filtros: TitularFiltros;
  onChange: (filtros: TitularFiltros) => void;
}

const STATUS_OPTIONS = [
  { value: 'ATIVO' as TitularStatus, label: 'Ativo' },
  { value: 'FALECIDO' as TitularStatus, label: 'Falecido' },
  { value: 'TRANSFERINDO' as TitularStatus, label: 'Transferindo' },
];

export function TitularesFilters({ filtros, onChange }: TitularesFiltersProps) {
  const { data: associacoesResp } = useAssociacoes();
  const [nomeDraft, setNomeDraft] = useState(filtros.nome ?? '');
  const [docDraft, setDocDraft] = useState(filtros.documento ?? '');

  const nomeDebouncado = useDebounce(nomeDraft, 300);
  const docDebouncado = useDebounce(docDraft, 300);

  useEffect(() => {
    onChange({ ...filtros, nome: nomeDebouncado || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeDebouncado]);

  useEffect(() => {
    onChange({ ...filtros, documento: docDebouncado || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docDebouncado]);

  const associacaoOptions =
    associacoesResp?.map((a: { id: string; sigla: string }) => ({
      value: a.id,
      label: a.sigla,
    })) ?? [];

  return (
    <div className={styles.filters}>
      <TextInput
        placeholder="Buscar por nome..."
        value={nomeDraft}
        onChange={setNomeDraft}
        aria-label="Filtrar por nome"
      />
      <TextInput
        placeholder="CPF / CNPJ"
        value={docDraft}
        onChange={setDocDraft}
        mono
        aria-label="Filtrar por documento"
      />
      <Select
        value={filtros.associacaoId ?? ''}
        onChange={(val) => onChange({ ...filtros, associacaoId: val || undefined, page: 1 })}
        options={associacaoOptions}
        placeholder="Todas as Associações"
        aria-label="Filtrar por associação"
      />
      <Select<TitularStatus | ''>
        value={filtros.status ?? ''}
        onChange={(val) =>
          onChange({ ...filtros, status: (val as TitularStatus) || undefined, page: 1 })
        }
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />
    </div>
  );
}
