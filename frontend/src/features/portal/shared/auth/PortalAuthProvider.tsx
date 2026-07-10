import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PortalAuthContext } from './PortalAuthContext';
import type { TitularInfo } from './PortalAuthContext';
import {
  clearPortalToken,
  clearStoredPortalAuth,
  getStoredPortalAuth,
  setPortalToken,
  setStoredPortalAuth,
} from './portalToken';

interface LoginResponse {
  token: string;
  expiraEm: string;
  titular: TitularInfo;
}

interface PortalAuthProviderProps {
  children: ReactNode;
  portalApiBaseUrl: string;
}

export class PortalApiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail);
    this.name = 'PortalApiError';
  }
}

async function createPortalApiError(response: Response, fallbackDetail: string): Promise<PortalApiError> {
  const error = await response.json().catch(() => ({ detail: fallbackDetail }));
  const detail = typeof error.detail === 'string' ? error.detail : fallbackDetail;

  return new PortalApiError(response.status, detail);
}

export function PortalAuthProvider({ children, portalApiBaseUrl }: PortalAuthProviderProps) {
  const [titular, setTitular] = useState<TitularInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredPortalAuth();
    if (stored) {
      const expiraEm = new Date(stored.expiraEm);
      if (expiraEm > new Date()) {
        setToken(stored.token);
        setTitular(stored.titular);
        setPortalToken(stored.token);
      } else {
        clearStoredPortalAuth();
        clearPortalToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (documento: string, senha: string) => {
      const response = await fetch(`${portalApiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, senha }),
      });

      if (!response.ok) {
        throw await createPortalApiError(response, 'Credenciais inválidas');
      }

      const data = (await response.json()) as LoginResponse;
      setToken(data.token);
      setTitular(data.titular);
      setPortalToken(data.token);
      setStoredPortalAuth({
        token: data.token,
        titular: data.titular,
        expiraEm: data.expiraEm,
      });
    },
    [portalApiBaseUrl],
  );

  const signup = useCallback(
    async (documento: string, caeIpi: string, senha: string) => {
      const response = await fetch(`${portalApiBaseUrl}/auto-cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento, caeIpi, senha }),
      });

      if (!response.ok) {
        throw await createPortalApiError(response, 'Erro ao criar conta');
      }
    },
    [portalApiBaseUrl],
  );

  const logout = useCallback(() => {
    setToken(null);
    setTitular(null);
    clearPortalToken();
    clearStoredPortalAuth();
  }, []);

  const value = useMemo(
    () => ({
      titular,
      token,
      isAuthenticated: token !== null && titular !== null,
      isLoading,
      login,
      signup,
      logout,
    }),
    [titular, token, isLoading, login, signup, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}
