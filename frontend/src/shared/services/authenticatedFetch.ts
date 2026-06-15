type TokenProvider = () => string | null | Promise<string | null>;
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
  tokenProvider: TokenProvider | null,
): Promise<Response> {
  const token = tokenProvider ? await tokenProvider() : null;
  const response = await fetchWithToken(url, options, token);

  if (response.status !== 401 || !handleUnauthorized) {
    return response;
  }

  const renewedToken = await getRenewedToken();

  if (!renewedToken) {
    return response;
  }

  return fetchWithToken(url, options, renewedToken);
}

export function createAuthenticatedFetchClient(externalProvider?: TokenProvider) {
  let getClientAuthToken: TokenProvider | null = null;

  const resolveProvider = (): string | null | Promise<string | null> => {
    if (externalProvider) {
      return externalProvider();
    }
    return getClientAuthToken?.() ?? null;
  };

  return {
    setAuthTokenProvider(fn: TokenProvider | null) {
      getClientAuthToken = fn;
    },
    fetchWithAuth(url: string, options: RequestInit = {}) {
      return fetchWithAuthUsingProvider(url, options, resolveProvider);
    },
  };
}

const defaultClient = createAuthenticatedFetchClient();

export const setAuthenticatedFetchAuthTokenProvider = defaultClient.setAuthTokenProvider;
export const fetchWithAuth = defaultClient.fetchWithAuth;
