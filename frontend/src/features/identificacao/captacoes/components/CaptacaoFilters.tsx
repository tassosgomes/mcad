import { useState } from 'react';
import { Select } from '@components/ui/select';
import { FormField } from '@components/ui/form-field';
import { Autocomplete } from '@components/ui/autocomplete';
import type { CaptacaoFiltros } from '../types/captacao';
import type { UsuarioMusicaSnapshot } from '../types/usuario-musica-snapshot';
import { useRubricas } from '../hooks/useRubricas';
import { useAnalistas } from '../hooks/useAnalistas';
import { useBuscaUsuariosMusica } from '../hooks/useBuscaUsuariosMusica';
import styles from './CaptacaoFilters.module.css';

interface CaptacaoFiltersProps {
  filtros: CaptacaoFiltros;
  onChange: (filtros: CaptacaoFiltros) => void;
}

export function CaptacaoFilters({ filtros, onChange }: CaptacaoFiltersProps) {
  const { data: rubricas, isLoading: isLoadingRubricas } = useRubricas();
  const { data: analistas, isLoading: isLoadingAnalistas } = useAnalistas();

  const [usuarioBusca, setUsuarioBusca] = useState('');
  const [usuarioDisplay, setUsuarioDisplay] = useState('');

  const { results: usuariosResults, isFetching: isFetchingUsuarios } = useBuscaUsuariosMusica(usuarioBusca);

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

  const analistaOptions = analistas?.map(a => ({
    value: a.id,
    label: a.nome,
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

      <FormField label="Responsável">
        <Select
          value={filtros.analistaResponsavelId || ''}
          onChange={(val) => handleChange('analistaResponsavelId', val)}
          disabled={isLoadingAnalistas || (!isLoadingAnalistas && analistaOptions.length === 0)}
          options={[{ value: '', label: 'Todos' }, ...analistaOptions]}
        />
      </FormField>

      <FormField label="Usuário de Música">
        <Autocomplete<UsuarioMusicaSnapshot>
          id="captacao-filtro-usuario"
          placeholder="Buscar por razão social (mín. 2 caracteres)..."
          value={usuarioDisplay}
          onSearch={(q) => {
            setUsuarioBusca(q);
            if (!q) {
              setUsuarioDisplay('');
              handleChange('usuarioMusicaId', '');
            }
          }}
          results={usuariosResults}
          isLoading={isFetchingUsuarios}
          renderItem={(u, _highlighted) => (
            <div>
              <span>{u.razaoSocial}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}>
                {u.cnpjFormatado || u.cnpj}
              </span>
            </div>
          )}
          onSelect={(u) => {
            setUsuarioDisplay(u.razaoSocial);
            handleChange('usuarioMusicaId', u.id);
          }}
          minChars={2}
          emptyStateMessage="Nenhum usuário encontrado. Verifique o cadastro na Arrecadação."
        />
      </FormField>
    </div>
  );
}
