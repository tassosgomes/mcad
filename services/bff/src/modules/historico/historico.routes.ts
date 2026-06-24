import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import type { FetchLike } from '../../shared/auth/authzContext.js';
import {
  handleAssignmentHistorico,
  handleProcessoHistorico,
} from './historico.service.js';

export interface HistoricoRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

export async function registerHistoricoRoutes(
  server: FastifyInstance,
  options: HistoricoRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for historico routes');
  }

  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/distribuicao/processos/:id/historico', (request, reply) =>
    handleProcessoHistorico(request, reply, serviceOptions));
  server.get('/api/acessos/atribuicoes/historico', (request, reply) =>
    handleAssignmentHistorico(request, reply, serviceOptions));
}
