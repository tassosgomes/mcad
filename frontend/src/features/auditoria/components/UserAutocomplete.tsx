import { useState } from 'react';
import { Autocomplete } from '@components/ui/autocomplete';
import { useUsuarios, type AcessoUsuario } from '@features/autorizacao/api/acessosApi';
import styles from './UserAutocomplete.module.css';

export interface SelectedUser {
  id: string;
  label: string;
}

export interface UserAutocompleteProps {
  value: SelectedUser | null;
  onChange: (value: SelectedUser | null) => void;
  id?: string;
  label?: string;
  placeholder?: string;
}

function buildLabel(user: AcessoUsuario): string {
  return user.name || user.email || user.subject;
}

export function UserAutocomplete({
  value,
  onChange,
  id = 'user-autocomplete',
  label,
  placeholder = 'Buscar por nome, email ou identificador',
}: UserAutocompleteProps) {
  const [query, setQuery] = useState(value?.label ?? '');
  const usuariosQuery = useUsuarios(
    { page: 0, size: 10, query },
    query.trim().length >= 2,
  );

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <Autocomplete
        id={id}
        placeholder={placeholder}
        value={query}
        onSearch={(newQuery) => {
          setQuery(newQuery);
          if (!newQuery) {
            onChange(null);
          }
        }}
        results={usuariosQuery.data?.items ?? []}
        isLoading={usuariosQuery.isFetching}
        onSelect={(user) => {
          const next = { id: user.id, label: buildLabel(user) };
          setQuery(next.label);
          onChange(next);
        }}
        renderItem={(user) => (
          <span className={styles.option}>
            <strong>{buildLabel(user)}</strong>
            {user.email && user.email !== buildLabel(user) && (
              <span className={styles.optionSecondary}>{user.email}</span>
            )}
          </span>
        )}
      />
    </div>
  );
}
