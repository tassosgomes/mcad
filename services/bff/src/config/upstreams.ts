import { getEnv } from './env.js';

export interface UpstreamConfig {
  name: string;
  prefix: string;
  baseUrl: string;
}

export function loadUpstreams(): UpstreamConfig[] {
  return [
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
  ];
}
