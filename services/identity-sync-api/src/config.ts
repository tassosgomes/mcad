export interface IdentitySyncConfig {
  host: string;
  port: number;
  webhookSigningKey: string;
  syncAdminToken: string | null;
  logtoM2mClientId: string | null;
  logtoM2mClientSecret: string | null;
  logtoManagementApi: string | null;
  rabbitMqUrl: string;
  exchangeName: string;
  requestBodyLimitBytes: number;
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
    webhookSigningKey: readRequired('LOGTO_WEBHOOK_SYNC_KEY'),
    syncAdminToken: process.env.IDENTITY_SYNC_ADMIN_TOKEN ?? null,
    logtoM2mClientId: process.env.LOGTO_M2M_CLIENT_ID ?? null,
    logtoM2mClientSecret: process.env.LOGTO_M2M_CLIENT_SECRET ?? null,
    logtoManagementApi: process.env.LOGTO_MANAGEMENT_API ?? null,
    rabbitMqUrl: buildRabbitMqUrl(),
    exchangeName: process.env.IDENTITY_EVENTS_EXCHANGE ?? 'identity.events',
    requestBodyLimitBytes: readNumber('REQUEST_BODY_LIMIT_BYTES', 1024 * 1024),
  };
}
