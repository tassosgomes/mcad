const TOKEN_KEY = 'portal_token';

interface StoredPortalAuth {
  token: string;
  titular: {
    id: string;
    nome: string;
  };
  expiraEm: string;
}

export function getPortalToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setPortalToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearPortalToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getStoredPortalAuth(): StoredPortalAuth | null {
  const raw = sessionStorage.getItem('portal_auth');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPortalAuth;
  } catch {
    return null;
  }
}

export function setStoredPortalAuth(auth: StoredPortalAuth): void {
  sessionStorage.setItem('portal_auth', JSON.stringify(auth));
}

export function clearStoredPortalAuth(): void {
  sessionStorage.removeItem('portal_auth');
}
