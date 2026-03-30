import type { ReactNode } from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={[styles.field, className ?? ''].join(' ')}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        {required && <span className={styles.required}>*</span>}
      </div>
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
