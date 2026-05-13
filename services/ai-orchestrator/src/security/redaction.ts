const TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const API_KEY_PATTERN = /\b(sk-[A-Za-z0-9_-]{8,}|[A-Za-z0-9_-]*api[_-]?key[A-Za-z0-9_-]*)\b/gi;

export function redactSensitiveText(value: string): string {
  return value
    .replace(TOKEN_PATTERN, 'Bearer [REDACTED]')
    .replace(EMAIL_PATTERN, '[EMAIL_REDACTED]')
    .replace(CPF_PATTERN, '[CPF_REDACTED]')
    .replace(CNPJ_PATTERN, '[CNPJ_REDACTED]')
    .replace(API_KEY_PATTERN, '[SECRET_REDACTED]');
}

export function redactSensitiveData<T>(value: T): T {
  if (typeof value === 'string') {
    return redactSensitiveText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item)) as T;
  }

  if (value && typeof value === 'object') {
    const redactedEntries = Object.entries(value).map(([key, entryValue]) => {
      if (/token|password|secret|api[-_]?key|authorization/i.test(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, redactSensitiveData(entryValue)];
    });

    return Object.fromEntries(redactedEntries) as T;
  }

  return value;
}
