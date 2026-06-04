const PT_BR_DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const PT_BR_DATE_SHORT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const PT_BR_DATE_ONLY = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const RELATIVE = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function formatAuditDate(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return PT_BR_DATE.format(date);
}

export function formatAuditDateShort(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return PT_BR_DATE_SHORT.format(date);
}

export function formatAuditDateOnly(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return PT_BR_DATE_ONLY.format(date);
}

/**
 * "Hoje 14:32", "Ontem 09:15", "Há 3 dias" — usado em listas/cards para dar
 * referência temporal sem exigir leitura de data completa.
 */
export function formatAuditRelative(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  const hours = Math.round(diffMs / 3_600_000);
  const days = Math.round(diffMs / 86_400_000);

  if (Math.abs(minutes) < 1) return 'agora há pouco';
  if (Math.abs(minutes) < 60) return RELATIVE.format(-minutes, 'minute');
  if (Math.abs(hours) < 24) return RELATIVE.format(-hours, 'hour');
  if (Math.abs(days) < 7) return RELATIVE.format(-days, 'day');

  return PT_BR_DATE_SHORT.format(date);
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return '[valor indisponível]';
  }
}

export function toIsoDateTime(value: string): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString();
}

export function compactParams(params: Record<string, string | number | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}
