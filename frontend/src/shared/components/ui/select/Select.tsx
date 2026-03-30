import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: T | '';
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  error?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  id,
  disabled,
  className,
  ...rest
}: SelectProps<T>) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          styles.select,
          error ? styles.error : '',
          disabled ? styles.disabled : '',
          className ?? '',
        ].join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
