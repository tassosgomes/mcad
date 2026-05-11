type RuntimeEnv = {
  CADASTRO_API_BASE_URL?: string;
  IDENTIFICACAO_API_BASE_URL?: string;
  ARRECADACAO_API_BASE_URL?: string;
  DISTRIBUICAO_API_BASE_URL?: string;
  AUDITORIA_API_BASE_URL?: string;
  AUTHZ_API_BASE_URL?: string;
  OIDC_AUTHORITY?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_AUDIENCE?: string;
  OIDC_REDIRECT_URI?: string;
  OIDC_POST_LOGOUT_REDIRECT_URI?: string;
};

declare global {
  interface Window {
    RUNTIME_ENV?: RuntimeEnv;
  }
}

const runtimeEnv: RuntimeEnv =
  typeof window !== 'undefined' && window.RUNTIME_ENV ? window.RUNTIME_ENV : {};

const getRuntimeValue = (key: keyof RuntimeEnv, fallback = ''): string => {
  const value = runtimeEnv[key];
  return value && !value.includes('${') ? value : fallback;
};

export const runtimeConfig = {
  cadastroApiBaseUrl: getRuntimeValue('CADASTRO_API_BASE_URL', '/api/cadastro/v1'),
  identificacaoApiBaseUrl: getRuntimeValue(
    'IDENTIFICACAO_API_BASE_URL',
    '/api/identificacao/v1',
  ),
  arrecadacaoApiBaseUrl: getRuntimeValue(
    'ARRECADACAO_API_BASE_URL',
    '/api/arrecadacao/v1',
  ),
  distribuicaoApiBaseUrl: getRuntimeValue(
    'DISTRIBUICAO_API_BASE_URL',
    '/api/distribuicao/v1',
  ),
  auditoriaApiBaseUrl: getRuntimeValue(
    'AUDITORIA_API_BASE_URL',
    '/api/auditoria/v1',
  ),
  authzApiBaseUrl: getRuntimeValue(
    'AUTHZ_API_BASE_URL',
    'https://mcad-authz.tasso.dev.br/v1',
  ),
  oidcAuthority: getRuntimeValue('OIDC_AUTHORITY'),
  oidcClientId: getRuntimeValue('OIDC_CLIENT_ID'),
  oidcAudience: getRuntimeValue('OIDC_AUDIENCE'),
  oidcRedirectUri: getRuntimeValue('OIDC_REDIRECT_URI'),
  oidcPostLogoutRedirectUri: getRuntimeValue('OIDC_POST_LOGOUT_REDIRECT_URI'),
} as const;
