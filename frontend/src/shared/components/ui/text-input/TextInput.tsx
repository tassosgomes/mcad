import type { InputHTMLAttributes } from 'react';
import styles from './TextInput.module.css';

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  mono?: boolean;
}

export function TextInput({
  value,
  onChange,
  label,
  error,
  mono,
  id,
  className,
  disabled,
  ...rest
}: TextInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          styles.input,
          error ? styles.error : '',
          mono ? styles.mono : '',
          disabled ? styles.disabled : '',
          className ?? '',
        ].join(' ')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        {...rest}
      />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
