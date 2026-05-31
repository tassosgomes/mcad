import type { ActorDisplayResponse, ActorDisplayStatus } from '../../types/actor';
import styles from './ActorDisplay.module.css';

export type ActorDisplaySize = 'sm' | 'md';

interface ActorDisplayProps {
  actor?: ActorDisplayResponse | null;
  fallbackLabel?: string | null;
  size?: ActorDisplaySize;
}

const DEFAULT_LABEL = 'Sistema';

const STATUS_LABELS: Partial<Record<ActorDisplayStatus, string>> = {
  SUSPENSO: 'Suspenso',
  REMOVIDO: 'Removido',
};

function normalizeLabel(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function ActorDisplay({
  actor,
  fallbackLabel,
  size = 'sm',
}: ActorDisplayProps) {
  const label = normalizeLabel(actor?.label) ?? normalizeLabel(fallbackLabel) ?? DEFAULT_LABEL;
  const statusLabel = actor ? STATUS_LABELS[actor.status] : undefined;
  const accessibleLabel = statusLabel ? `${label} - ${statusLabel}` : label;

  return (
    <span className={[styles.actorDisplay, styles[size]].join(' ')} aria-label={accessibleLabel}>
      <span className={styles.label}>{label}</span>
      {statusLabel ? (
        <span className={styles.status} aria-hidden="true">
          {statusLabel}
        </span>
      ) : null}
    </span>
  );
}

export type { ActorDisplayProps };
