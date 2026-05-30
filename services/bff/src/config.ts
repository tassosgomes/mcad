export interface UpstreamConfig {
  name: string;
  prefix: string;
  baseUrl: string;
}

export interface BffConfig {
  host: string;
  port: number;
  requestBodyLimitBytes: number;
  corsAllowedOrigins: string[];
  upstreams: UpstreamConfig[];
  enableLegacyCadastroRoute: boolean;
  authzBaseUrl: string;
  authzTimeoutMs: number;
  aiRuntimeAuthSecret?: string;
  meCacheTtlSeconds: number;
  auditBaseUrl: string;
  auditTimeoutMs: number;
}

const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 50 * 1024 * 1024;
const DEFAULT_AUTHZ_BASE_URL = 'http://localhost:8085';
const DEFAULT_AUTHZ_TIMEOUT_MS = 3000;
const DEFAULT_ME_CACHE_TTL_SECONDS = 60;
const MAX_ME_CACHE_TTL_SECONDS = 300;
const DEFAULT_AUDIT_TIMEOUT_MS = 5000;

function getEnv(name: string, fallback: string): string {
  const value = process.env[name];

  return value && value.trim() ? value.trim() : fallback;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }

  return value.trim();
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

function getListEnv(name: string, fallback: string[]): string[] {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getMeCacheTtlSeconds(): number {
  const ttlSeconds = getNumberEnv('ME_CACHE_TTL_SECONDS', DEFAULT_ME_CACHE_TTL_SECONDS);

  if (ttlSeconds > MAX_ME_CACHE_TTL_SECONDS) {
    throw new Error(`ME_CACHE_TTL_SECONDS must be less than or equal to ${MAX_ME_CACHE_TTL_SECONDS}`);
  }

  return ttlSeconds;
}

export function loadConfig(): BffConfig {
  return {
    host: getEnv('BFF_HOST', '0.0.0.0'),
    port: getNumberEnv('BFF_PORT', 5200),
    requestBodyLimitBytes: getNumberEnv('BFF_BODY_LIMIT_BYTES', DEFAULT_REQUEST_BODY_LIMIT_BYTES),
    corsAllowedOrigins: getListEnv('BFF_CORS_ALLOWED_ORIGINS', [
      'http://localhost:5173',
      'https://mcad.tasso.dev.br',
    ]),
    enableLegacyCadastroRoute: getBooleanEnv('BFF_ENABLE_LEGACY_CADASTRO_ROUTE', true),
    authzBaseUrl: getEnv('AUTHZ_BASE_URL', DEFAULT_AUTHZ_BASE_URL).replace(/\/$/, ''),
    authzTimeoutMs: getNumberEnv('AUTHZ_TIMEOUT_MS', DEFAULT_AUTHZ_TIMEOUT_MS),
    aiRuntimeAuthSecret: getEnv('AI_RUNTIME_AUTH_SECRET', ''),
    meCacheTtlSeconds: getMeCacheTtlSeconds(),
    auditBaseUrl: getRequiredEnv('AUDIT_BASE_URL').replace(/\/$/, ''),
    auditTimeoutMs: getNumberEnv('AUDIT_TIMEOUT_MS', DEFAULT_AUDIT_TIMEOUT_MS),
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
      {
        name: 'authz',
        prefix: '/api/authz/v1',
        baseUrl: getEnv('AUTHZ_UPSTREAM_BASE_URL', 'https://mcad-authz.tasso.dev.br/v1'),
      },
      {
        name: 'ai',
        prefix: '/api/ai/v1',
        baseUrl: getEnv('AI_ORCHESTRATOR_BASE_URL', 'http://localhost:5300/v1'),
      },
      {
        name: 'authz-legacy',
        prefix: '/v1',
        baseUrl: getEnv('AUTHZ_UPSTREAM_BASE_URL', 'https://mcad-authz.tasso.dev.br/v1'),
      },
    ],
  };
}
