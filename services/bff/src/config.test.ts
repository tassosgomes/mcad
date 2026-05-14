import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { loadConfig } from './config.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('loadConfig returns proxy defaults', () => {
  delete process.env.BFF_PORT;
  delete process.env.BFF_CORS_ALLOWED_ORIGINS;
  delete process.env.CADASTRO_API_BASE_URL;
  delete process.env.AUTHZ_UPSTREAM_BASE_URL;
  delete process.env.AI_ORCHESTRATOR_BASE_URL;
  delete process.env.AUTHZ_BASE_URL;
  delete process.env.AUTHZ_TIMEOUT_MS;
  delete process.env.ME_CACHE_TTL_SECONDS;

  const config = loadConfig();

  assert.equal(config.port, 5200);
  assert.equal(config.enableLegacyCadastroRoute, true);
  assert.equal(config.authzBaseUrl, 'http://localhost:8085');
  assert.equal(config.authzTimeoutMs, 3000);
  assert.equal(config.meCacheTtlSeconds, 60);
  assert.deepEqual(config.corsAllowedOrigins, [
    'http://localhost:5173',
    'https://mcad.tasso.dev.br',
  ]);
  assert.equal(config.upstreams.length, 8);
  assert.deepEqual(
    config.upstreams.map((upstream) => upstream.prefix),
    [
      '/api/cadastro/v1',
      '/api/identificacao/v1',
      '/api/arrecadacao/v1',
      '/api/distribuicao/v1',
      '/api/auditoria/v1',
      '/api/authz/v1',
      '/api/ai/v1',
      '/v1',
    ],
  );
});

test('loadConfig reads environment overrides', () => {
  process.env.BFF_PORT = '5300';
  process.env.BFF_ENABLE_LEGACY_CADASTRO_ROUTE = 'false';
  process.env.BFF_CORS_ALLOWED_ORIGINS = 'https://mcad.example, http://localhost:5173';
  process.env.CADASTRO_API_BASE_URL = 'http://cadastro:5001/api/v1';
  process.env.AUTHZ_UPSTREAM_BASE_URL = 'https://authz.example/v1';
  process.env.AI_ORCHESTRATOR_BASE_URL = 'http://ai-orchestrator:5300/v1';
  process.env.AUTHZ_BASE_URL = 'https://authz.example/';
  process.env.AUTHZ_TIMEOUT_MS = '5000';
  process.env.ME_CACHE_TTL_SECONDS = '120';

  const config = loadConfig();
  const cadastro = config.upstreams.find((upstream) => upstream.name === 'cadastro');
  const authz = config.upstreams.find((upstream) => upstream.name === 'authz');
  const authzLegacy = config.upstreams.find((upstream) => upstream.name === 'authz-legacy');
  const ai = config.upstreams.find((upstream) => upstream.name === 'ai');

  assert.equal(config.port, 5300);
  assert.equal(config.enableLegacyCadastroRoute, false);
  assert.deepEqual(config.corsAllowedOrigins, ['https://mcad.example', 'http://localhost:5173']);
  assert.equal(cadastro?.baseUrl, 'http://cadastro:5001/api/v1');
  assert.equal(authz?.baseUrl, 'https://authz.example/v1');
  assert.equal(authzLegacy?.baseUrl, 'https://authz.example/v1');
  assert.equal(ai?.baseUrl, 'http://ai-orchestrator:5300/v1');
  assert.equal(config.authzBaseUrl, 'https://authz.example');
  assert.equal(config.authzTimeoutMs, 5000);
  assert.equal(config.meCacheTtlSeconds, 120);
});
