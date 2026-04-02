import {
  InMemoryWebStorage,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from 'oidc-client-ts';

function requireEnv(name: 'VITE_OIDC_AUTHORITY' | 'VITE_OIDC_CLIENT_ID' | 'VITE_OIDC_REDIRECT_URI' | 'VITE_OIDC_POST_LOGOUT_REDIRECT_URI'): string {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(`Missing required OIDC environment variable: ${name}`);
  }

  return value;
}

function resolvePostLogoutRedirectUri(): string {
  const configuredUri = requireEnv('VITE_OIDC_POST_LOGOUT_REDIRECT_URI');

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
  const redirectUri = requireEnv('VITE_OIDC_REDIRECT_URI');

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
  authority: requireEnv('VITE_OIDC_AUTHORITY'),
  client_id: requireEnv('VITE_OIDC_CLIENT_ID'),
  redirect_uri: requireEnv('VITE_OIDC_REDIRECT_URI'),
  post_logout_redirect_uri: resolvePostLogoutRedirectUri(),
  silent_redirect_uri: resolveSilentRedirectUri(),
  response_type: 'code',
  scope: 'openid profile',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({
    store: new InMemoryWebStorage(),
  }),
};

export const userManager = new UserManager(oidcConfig);