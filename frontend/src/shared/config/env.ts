import { runtimeConfig } from './runtimeConfig';

// Configuração de variáveis de ambiente tipada
export const env = {
  apiBaseUrl: runtimeConfig.cadastroApiBaseUrl,
} as const;
