import { createHash } from 'node:crypto';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeJson(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }

  if (isJsonRecord(value)) {
    const sortedEntries = Object.entries(value)
      .filter(([, raw]) => raw !== undefined && typeof raw !== 'function' && typeof raw !== 'symbol')
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(
      sortedEntries.map(([key, raw]) => [key, normalizeJson(raw)]),
    ) as { [key: string]: JsonValue };
  }

  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

export function calculateSnapshotContentHash(value: unknown): string {
  return createHash('sha256')
    .update(stableJsonStringify(value))
    .digest('hex');
}
