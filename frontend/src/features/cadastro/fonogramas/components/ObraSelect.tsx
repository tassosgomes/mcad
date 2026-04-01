import { useState, useEffect } from 'react';
import { Autocomplete } from '@components/ui/autocomplete';
import { useObras } from '../../obras/hooks/useObras';
import { Badge } from '@components/ui/badge';
import type { ObraMusical } from '../../obras/types/obra';
import styles from './ObraSelect.module.css';

interface ObraSelectProps {
  value?: string;
  onChange: (id: string, titulo: string) => void;
  disabled?: boolean;
  id?: string;
}

export function ObraSelect({ value, onChange, disabled, id }: ObraSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading } = useObras({
    page: 1,
    size: 50,
    titulo: debouncedTerm,
  });

  const obrasList = data?.data || [];

  return (
    <div className={styles.wrapper}>
      <Autocomplete<ObraMusical>
        id={id}
        value={value}
        onSearch={setSearchTerm}
        results={obrasList}
        isLoading={isLoading}
        placeholder="Buscar obra pelo título..."
        disabled={disabled}
        minChars={2}
        onSelect={(item) => {
          onChange(item.id, item.titulo);
          setSearchTerm('');
        }}
        renderItem={(item, isHighlighted) => (
          <div className={`${styles.item} ${isHighlighted ? styles.highlighted : ''}`}>
            <span className={styles.title}>{item.titulo}</span>
            <div className={styles.badges}>
              <Badge variant="accent">{item.tipo}</Badge>
              <Badge variant={item.status === 'LIBERADO' ? 'success' : 'warning'}>{item.status}</Badge>
            </div>
          </div>
        )}
      />
    </div>
  );
}
