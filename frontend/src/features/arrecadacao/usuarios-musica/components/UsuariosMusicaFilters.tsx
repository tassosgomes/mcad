import { useEffect, useState } from 'react';
import { Button } from '@components/ui/button';
import { Select } from '@components/ui/select';
import { TextInput } from '@components/ui/text-input';
import { useDebounce } from '@hooks/useDebounce';
import type { StatusUsuarioMusica, UsuarioMusicaFiltros } from '../types/usuario-musica';
import { formatCnpj, onlyAlphanumeric } from '../utils/formatters';
import styles from './UsuariosMusicaFilters.module.css';

interface UsuariosMusicaFiltersProps {
  filtros: UsuarioMusicaFiltros;
  onChange: (filtros: Partial<UsuarioMusicaFiltros>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: 'ATIVO' as StatusUsuarioMusica, label: 'Ativo' },
  { value: 'INATIVO' as StatusUsuarioMusica, label: 'Inativo' },
];

export function UsuariosMusicaFilters({ filtros, onChange, onReset }: UsuariosMusicaFiltersProps) {
  const [razaoSocialDraft, setRazaoSocialDraft] = useState(filtros.razaoSocial ?? '');
  const [cnpjDraft, setCnpjDraft] = useState(formatCnpj(filtros.cnpj ?? ''));
  const [cidadeDraft, setCidadeDraft] = useState(filtros.cidade ?? '');
  const razaoSocialDebounced = useDebounce(razaoSocialDraft, 300);
  const cnpjDebounced = useDebounce(cnpjDraft, 300);
  const cidadeDebounced = useDebounce(cidadeDraft, 300);

  useEffect(() => {
    onChange({ razaoSocial: razaoSocialDebounced || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razaoSocialDebounced]);

  useEffect(() => {
    onChange({ cnpj: onlyAlphanumeric(cnpjDebounced) || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpjDebounced]);

  useEffect(() => {
    onChange({ cidade: cidadeDebounced || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidadeDebounced]);

  function handleReset() {
    setRazaoSocialDraft('');
    setCnpjDraft('');
    setCidadeDraft('');
    onReset();
  }

  return (
    <div className={styles.filters}>
      <TextInput
        placeholder="Razão social"
        value={razaoSocialDraft}
        onChange={setRazaoSocialDraft}
        aria-label="Filtrar por razão social"
      />
      <TextInput
        placeholder="CNPJ"
        value={cnpjDraft}
        onChange={(value) => setCnpjDraft(formatCnpj(value))}
        aria-label="Filtrar por CNPJ"
        mono
      />
      <Select<StatusUsuarioMusica | ''>
        value={filtros.status ?? ''}
        onChange={(value) => onChange({ status: (value as StatusUsuarioMusica) || undefined, page: 1 })}
        options={STATUS_OPTIONS}
        placeholder="Todos os status"
        aria-label="Filtrar por status"
      />
      <TextInput
        placeholder="Cidade"
        value={cidadeDraft}
        onChange={setCidadeDraft}
        aria-label="Filtrar por cidade"
      />
      <Button variant="secondary" onClick={handleReset} type="button" id="btn-reset-filtros-usuarios-musica">
        Limpar filtros
      </Button>
    </div>
  );
}
