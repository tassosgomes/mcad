import { useMemo, useState } from 'react';
import { screenCatalog } from '../constants/screenCatalog';
import styles from './ScreenSelect.module.css';

export interface ScreenSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  /** Texto exibido como primeira opção quando nada está selecionado. */
  placeholder?: string;
  /** Quando true, exibe o item "Outra tela (avançado)" e revela input livre. */
  allowCustom?: boolean;
  /** Permite limpar a seleção (opção "Todas as telas"). */
  allowEmpty?: boolean;
}

const CUSTOM_OPTION = '__custom__';

export function ScreenSelect({
  value,
  onChange,
  id = 'screen-select',
  label,
  placeholder = 'Selecione uma tela',
  allowCustom = true,
  allowEmpty = true,
}: ScreenSelectProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof screenCatalog>();
    for (const entry of screenCatalog) {
      const list = map.get(entry.domain) ?? [];
      list.push(entry);
      map.set(entry.domain, list);
    }
    return Array.from(map.entries());
  }, []);

  const isKnown = useMemo(
    () => !value || screenCatalog.some((s) => s.screenId === value),
    [value],
  );
  const [customMode, setCustomMode] = useState(!isKnown);

  const selectValue = customMode ? CUSTOM_OPTION : value;

  const handleSelectChange = (newValue: string) => {
    if (newValue === CUSTOM_OPTION) {
      setCustomMode(true);
      onChange('');
      return;
    }
    setCustomMode(false);
    onChange(newValue);
  };

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={styles.select}
        value={selectValue}
        onChange={(event) => handleSelectChange(event.target.value)}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {grouped.map(([domain, items]) => (
          <optgroup key={domain} label={domain}>
            {items.map((entry) => (
              <option key={entry.screenId} value={entry.screenId}>
                {entry.label}
              </option>
            ))}
          </optgroup>
        ))}
        {allowCustom && <option value={CUSTOM_OPTION}>Outra tela (avançado)…</option>}
      </select>
      {customMode && (
        <input
          type="text"
          className={styles.customInput}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: cadastro.obras.lista"
          aria-label="Identificador técnico da tela"
        />
      )}
    </div>
  );
}
