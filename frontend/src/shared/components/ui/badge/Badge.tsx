import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'muted' | 'accent' | 'secondary';

export interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  mono?: boolean;
}

export function Badge({ variant, children, mono }: BadgeProps) {
  return (
    <span
      className={[
        styles.badge,
        styles[variant],
        mono ? styles.mono : '',
      ].join(' ')}
    >
      {children}
    </span>
  );
}
