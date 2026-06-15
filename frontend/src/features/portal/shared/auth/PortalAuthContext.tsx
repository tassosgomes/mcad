import { createContext } from 'react';

export interface TitularInfo {
  id: string;
  nome: string;
}

export interface PortalAuthContextValue {
  titular: TitularInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (documento: string, senha: string) => Promise<void>;
  signup: (documento: string, caeIpi: string, senha: string) => Promise<void>;
  logout: () => void;
}

export const PortalAuthContext = createContext<PortalAuthContextValue | undefined>(undefined);
