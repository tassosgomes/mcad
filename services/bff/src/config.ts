export interface UpstreamConfig {
  name: string;
  prefix: string;
  baseUrl: string;
}

export interface BffConfig {
  host: string;
  port: number;
  requestBodyLimitBytes: number;
  upstreams: UpstreamConfig[];
  enableLegacyCadastroRoute: boolean;
}

const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 50 * 1024 * 1024;

function getEnv(name: string, fallback: string): string {
  const value = process.env[name];

  return value && value.trim() ? value.trim() : fallback;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return parsedValue;
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function loadConfig(): BffConfig {
  return {
    host: getEnv('BFF_HOST', '0.0.0.0'),
    port: getNumberEnv('BFF_PORT', 5200),
    requestBodyLimitBytes: getNumberEnv('BFF_BODY_LIMIT_BYTES', DEFAULT_REQUEST_BODY_LIMIT_BYTES),
    enableLegacyCadastroRoute: getBooleanEnv('BFF_ENABLE_LEGACY_CADASTRO_ROUTE', true),
    upstreams: [
      {
        name: 'cadastro',
        prefix: '/api/cadastro/v1',
        baseUrl: getEnv('CADASTRO_API_BASE_URL', 'http://localhost:5001/api/v1'),
      },
      {
        name: 'identificacao',
        prefix: '/api/identificacao/v1',
        baseUrl: getEnv('IDENTIFICACAO_API_BASE_URL', 'http://localhost:5100/api/v1'),
      },
      {
        name: 'arrecadacao',
        prefix: '/api/arrecadacao/v1',
        baseUrl: getEnv('ARRECADACAO_API_BASE_URL', 'http://localhost:5003/api/v1'),
      },
      {
        name: 'distribuicao',
        prefix: '/api/distribuicao/v1',
        baseUrl: getEnv('DISTRIBUICAO_API_BASE_URL', 'http://localhost:5004/api/v1'),
      },
      {
        name: 'auditoria',
        prefix: '/api/auditoria/v1',
        baseUrl: getEnv('AUDITORIA_API_BASE_URL', 'https://api-audit.tasso.dev.br/api/v1'),
      },
    ],
  };
}
