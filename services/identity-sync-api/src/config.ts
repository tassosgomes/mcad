export interface IdentitySyncConfig {
  host: string;
  port: number;
  syncAdminToken: string | null;
  logtoM2mClientId: string;
  logtoM2mClientSecret: string;
  logtoManagementApi: string;
  rabbitMqUrl: string;
  exchangeName: string;
  requestBodyLimitBytes: number;
  schedulerEnabled: boolean;
  syncIntervalMs: number;
  syncOnStartup: boolean;
  logtoPageSize: number;
}

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`${name} must be a boolean (true/false)`);
}

function buildRabbitMqUrl(): string {
  if (process.env.RABBITMQ_URL) {
    return process.env.RABBITMQ_URL;
  }

  const host = process.env.RABBITMQ_HOST ?? 'localhost';
  const port = process.env.RABBITMQ_PORT ?? '5672';
  const user = encodeURIComponent(process.env.RABBITMQ_USER ?? 'guest');
  const password = encodeURIComponent(process.env.RABBITMQ_PASSWORD ?? 'guest');
  const vhost = encodeURIComponent(process.env.RABBITMQ_VHOST ?? '/');

  return `amqp://${user}:${password}@${host}:${port}/${vhost}`;
}

export function loadConfig(): IdentitySyncConfig {
  return {
    host: process.env.IDENTITY_SYNC_HOST ?? process.env.HOST ?? '0.0.0.0',
    port: readNumber('IDENTITY_SYNC_PORT', readNumber('PORT', 5300)),
    syncAdminToken: process.env.IDENTITY_SYNC_ADMIN_TOKEN ?? null,
    logtoM2mClientId: readRequired('LOGTO_M2M_CLIENT_ID'),
    logtoM2mClientSecret: readRequired('LOGTO_M2M_CLIENT_SECRET'),
    logtoManagementApi: readRequired('LOGTO_MANAGEMENT_API'),
    rabbitMqUrl: buildRabbitMqUrl(),
    exchangeName: process.env.IDENTITY_EVENTS_EXCHANGE ?? 'identity.events',
    requestBodyLimitBytes: readNumber('REQUEST_BODY_LIMIT_BYTES', 1024 * 1024),
    schedulerEnabled: readBoolean('IDENTITY_SYNC_SCHEDULER_ENABLED', true),
    syncIntervalMs: readNumber('IDENTITY_SYNC_INTERVAL_MS', 5 * 60 * 1000),
    syncOnStartup: readBoolean('IDENTITY_SYNC_ON_STARTUP', true),
    logtoPageSize: readNumber('LOGTO_PAGE_SIZE', 100),
  };
}
