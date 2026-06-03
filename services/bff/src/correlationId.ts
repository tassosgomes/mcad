import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toUuidCorrelationId(value: string): string {
  return UUID_PATTERN.test(value) ? value : randomUUID();
}
