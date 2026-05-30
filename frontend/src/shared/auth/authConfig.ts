import {
  InMemoryWebStorage,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from 'oidc-client-ts';

import { runtimeConfig } from '@/shared/config/runtimeConfig';

function requireRuntimeValue(name: string, value: string): string {
  if (!value) {
    throw new Error(`Missing required OIDC runtime configuration: ${name}`);
  }

  return value;
}

function getOidcRedirectUri(): string {
  return requireRuntimeValue('OIDC_REDIRECT_URI', runtimeConfig.oidcRedirectUri);
}

function resolvePostLogoutRedirectUri(): string {
  const configuredUri = requireRuntimeValue(
    'OIDC_POST_LOGOUT_REDIRECT_URI',
    runtimeConfig.oidcPostLogoutRedirectUri,
  );

  try {
    const parsedUri = new URL(configuredUri);

    if (parsedUri.pathname === '/' && !parsedUri.search && !parsedUri.hash) {
      parsedUri.pathname = '/logout';
      return parsedUri.toString();
    }

    return parsedUri.toString();
  } catch {
    return configuredUri;
  }
}

function resolveSilentRedirectUri(): string {
  const redirectUri = getOidcRedirectUri();

  try {
    const parsedUri = new URL(redirectUri);
    parsedUri.pathname = '/silent-callback';
    parsedUri.search = '';
    parsedUri.hash = '';
    return parsedUri.toString();
  } catch {
    return redirectUri;
  }
}

export const oidcConfig: UserManagerSettings = {
  authority: requireRuntimeValue('OIDC_AUTHORITY', runtimeConfig.oidcAuthority),
  client_id: requireRuntimeValue('OIDC_CLIENT_ID', runtimeConfig.oidcClientId),
  redirect_uri: getOidcRedirectUri(),
  post_logout_redirect_uri: resolvePostLogoutRedirectUri(),
  silent_redirect_uri: resolveSilentRedirectUri(),
  response_type: 'code',
  // 'access' e 'write' mantêm a audience da API resource https://api.mcad.local.
  // Papéis de negócio não são solicitados nem usados como claim funcional.
  scope: 'openid profile access write',
  // Logto (RFC 8707): o parâmetro 'resource' precisa estar em AMBOS os requests —
  // na autorização (extraQueryParams) E na troca de código (extraTokenParams).
  // Sem isso o Logto emite um token opaco sem aud da API.
  extraQueryParams: {
    resource: runtimeConfig.oidcAudience,
  },
  extraTokenParams: {
    resource: runtimeConfig.oidcAudience,
  },
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({
    store: new InMemoryWebStorage(),
  }),
};

export const userManager = new UserManager(oidcConfig);
