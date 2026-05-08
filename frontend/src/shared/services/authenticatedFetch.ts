type AuthTokenProvider = () => string | null;
type UnauthorizedHandler = () => Promise<string | null>;

let handleUnauthorized: UnauthorizedHandler | null = null;
let renewalRequest: Promise<string | null> | null = null;

export function setAuthenticatedFetchUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  handleUnauthorized = fn;

  if (!fn) {
    renewalRequest = null;
  }
}

function getRenewedToken(): Promise<string | null> {
  if (!handleUnauthorized) {
    return Promise.resolve(null);
  }

  renewalRequest ??= handleUnauthorized().finally(() => {
    renewalRequest = null;
  });

  return renewalRequest;
}

function fetchWithToken(url: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function fetchWithAuthUsingProvider(
  url: string,
  options: RequestInit,
  tokenProvider: AuthTokenProvider | null,
): Promise<Response> {
  const response = await fetchWithToken(url, options, tokenProvider?.() ?? null);

  if (response.status !== 401 || !handleUnauthorized) {
    return response;
  }

  const renewedToken = await getRenewedToken();

  if (!renewedToken) {
    return response;
  }

  return fetchWithToken(url, options, renewedToken);
}

export function createAuthenticatedFetchClient() {
  let getClientAuthToken: AuthTokenProvider | null = null;

  return {
    setAuthTokenProvider(fn: AuthTokenProvider | null) {
      getClientAuthToken = fn;
    },
    fetchWithAuth(url: string, options: RequestInit = {}) {
      return fetchWithAuthUsingProvider(url, options, getClientAuthToken);
    },
  };
}

const defaultClient = createAuthenticatedFetchClient();

export const setAuthenticatedFetchAuthTokenProvider = defaultClient.setAuthTokenProvider;
export const fetchWithAuth = defaultClient.fetchWithAuth;
