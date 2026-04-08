// Configuração de variáveis de ambiente tipada
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string || '/api/v1',
} as const;
