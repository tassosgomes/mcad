import {
  getBooleanEnv,
  getEnv,
  getListEnv,
  getNumberEnv,
  getRequiredEnv,
} from './env.js';
import { loadUpstreams, type UpstreamConfig } from './upstreams.js';

export type { UpstreamConfig };

export interface BffConfig {
  host: string;
  port: number;
  requestBodyLimitBytes: number;
  auditScreenAccessMaxResponseBytes: number;
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
const DEFAULT_AUDIT_SCREEN_ACCESS_MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_AUTHZ_BASE_URL = 'http://localhost:8085';
const DEFAULT_AUTHZ_TIMEOUT_MS = 3000;
const DEFAULT_ME_CACHE_TTL_SECONDS = 60;
const MAX_ME_CACHE_TTL_SECONDS = 300;
const DEFAULT_AUDIT_TIMEOUT_MS = 5000;

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
    auditScreenAccessMaxResponseBytes: getNumberEnv(
      'AUDIT_SCREEN_ACCESS_MAX_RESPONSE_BYTES',
      DEFAULT_AUDIT_SCREEN_ACCESS_MAX_RESPONSE_BYTES,
    ),
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
    upstreams: loadUpstreams(),
  };
}
