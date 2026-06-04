import { useMemo } from 'react';
import styles from './PeriodPicker.module.css';

export type PeriodPreset = 'today' | 'last24h' | 'last7d' | 'last30d' | 'custom';

export interface PeriodValue {
  preset: PeriodPreset;
  /** ISO datetime-local (yyyy-MM-ddTHH:mm) — só usado quando preset === 'custom'. */
  from: string;
  to: string;
}

export interface PeriodPickerProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  /** Identificador para `aria-labelledby` do grupo. */
  legend?: string;
}

const PRESET_LABEL: Record<PeriodPreset, string> = {
  today: 'Hoje',
  last24h: 'Últimas 24h',
  last7d: 'Últimos 7 dias',
  last30d: 'Últimos 30 dias',
  custom: 'Personalizado',
};

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function resolvePeriod(value: PeriodValue): { from: string; to: string } {
  if (value.preset === 'custom') {
    return { from: value.from, to: value.to };
  }
  const now = new Date();
  const to = toLocalInput(now);
  let fromDate: Date;
  switch (value.preset) {
    case 'today': {
      fromDate = new Date(now);
      fromDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'last24h':
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'last7d':
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last30d':
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      fromDate = now;
  }
  return { from: toLocalInput(fromDate), to };
}

export const DEFAULT_PERIOD: PeriodValue = {
  preset: 'last7d',
  from: '',
  to: '',
};

export function PeriodPicker({ value, onChange, legend = 'Período' }: PeriodPickerProps) {
  const presets: PeriodPreset[] = useMemo(
    () => ['today', 'last24h', 'last7d', 'last30d', 'custom'],
    [],
  );

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.chips} role="radiogroup" aria-label={legend}>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={value.preset === preset}
            className={[styles.chip, value.preset === preset ? styles.chipActive : ''].join(' ')}
            onClick={() => onChange({ ...value, preset })}
          >
            {PRESET_LABEL[preset]}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className={styles.customRange}>
          <label className={styles.dateField}>
            <span className={styles.dateLabel}>De</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={value.from}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
            />
          </label>
          <label className={styles.dateField}>
            <span className={styles.dateLabel}>Até</span>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={value.to}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
