import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { loadConfig } from './config.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('loadConfig returns proxy defaults', () => {
  delete process.env.BFF_PORT;
  delete process.env.CADASTRO_API_BASE_URL;

  const config = loadConfig();

  assert.equal(config.port, 5200);
  assert.equal(config.enableLegacyCadastroRoute, true);
  assert.equal(config.upstreams.length, 5);
  assert.deepEqual(
    config.upstreams.map((upstream) => upstream.prefix),
    [
      '/api/cadastro/v1',
      '/api/identificacao/v1',
      '/api/arrecadacao/v1',
      '/api/distribuicao/v1',
      '/api/auditoria/v1',
    ],
  );
});

test('loadConfig reads environment overrides', () => {
  process.env.BFF_PORT = '5300';
  process.env.BFF_ENABLE_LEGACY_CADASTRO_ROUTE = 'false';
  process.env.CADASTRO_API_BASE_URL = 'http://cadastro:5001/api/v1';

  const config = loadConfig();
  const cadastro = config.upstreams.find((upstream) => upstream.name === 'cadastro');

  assert.equal(config.port, 5300);
  assert.equal(config.enableLegacyCadastroRoute, false);
  assert.equal(cadastro?.baseUrl, 'http://cadastro:5001/api/v1');
});
