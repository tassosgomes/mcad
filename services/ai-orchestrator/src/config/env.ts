export interface AiOrchestratorConfig {
  host: string;
  port: number;
  environment: 'local' | 'dev' | 'prod';
  openAiApiKey: string;
  openAiModel: string;
  maxMessageChars: number;
  toolTimeoutMs: number;
  tracePrompts: boolean;
  storageUrl?: string;
  upstreams: {
    cadastroBaseUrl: string;
    identificacaoBaseUrl: string;
    arrecadacaoBaseUrl: string;
    distribuicaoBaseUrl: string;
    auditoriaBaseUrl: string;
    authzBaseUrl: string;
  };
}

function getEnv(name: string, fallback: string): string {
  const value = process.env[name];

  return value && value.trim() ? value.trim() : fallback;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];

  return value && value.trim() ? value.trim() : undefined;
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

function getEnvironment(): 'local' | 'dev' | 'prod' {
  const value = getEnv('AI_ENVIRONMENT', 'local');

  if (value === 'local' || value === 'dev' || value === 'prod') {
    return value;
  }

  throw new Error('AI_ENVIRONMENT must be one of: local, dev, prod');
}

export function loadConfig(): AiOrchestratorConfig {
  return {
    host: getEnv('AI_HOST', '0.0.0.0'),
    port: getNumberEnv('AI_PORT', 5300),
    environment: getEnvironment(),
    openAiApiKey: getEnv('OPENAI_API_KEY', ''),
    openAiModel: getEnv('OPENAI_MODEL', 'gpt-4.1-mini'),
    maxMessageChars: getNumberEnv('AI_MAX_MESSAGE_CHARS', 4000),
    toolTimeoutMs: getNumberEnv('AI_TOOL_TIMEOUT_MS', 10000),
    tracePrompts: getBooleanEnv('AI_TRACE_PROMPTS', false),
    storageUrl: getOptionalEnv('AI_STORAGE_URL'),
    upstreams: {
      cadastroBaseUrl: getEnv('CADASTRO_API_BASE_URL', 'http://localhost:5001/api/v1'),
      identificacaoBaseUrl: getEnv('IDENTIFICACAO_API_BASE_URL', 'http://localhost:5100/api/v1'),
      arrecadacaoBaseUrl: getEnv('ARRECADACAO_API_BASE_URL', 'http://localhost:5003/api/v1'),
      distribuicaoBaseUrl: getEnv('DISTRIBUICAO_API_BASE_URL', 'http://localhost:5004/api/v1'),
      auditoriaBaseUrl: getEnv('AUDITORIA_API_BASE_URL', 'https://api-audit.tasso.dev.br/api/v1'),
      authzBaseUrl: getEnv('AUTHZ_UPSTREAM_BASE_URL', 'https://mcad-authz.tasso.dev.br/v1'),
    },
  };
}
