import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import {
  deriveSubjectIdFromJwt,
  extractBearer,
  type FetchLike,
  resolveAuthzContext,
  sendError,
} from '../../shared/auth/authzContext.js';
import type { MeCache } from '../../shared/auth/meCache.js';
import { resolveDashboardAccess } from './dashboard.permissions.js';
import type {
  ArrecadacaoResumo,
  CadastroResumo,
  DashboardResponse,
  DistribuicaoResumo,
  IdentificacaoResumo,
} from './dashboard.types.js';

export interface DashboardServiceOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl: FetchLike;
}

const UPSTREAM_TIMEOUT_MS = 5000;

async function fetchUpstream<T>(
  baseUrl: string,
  path: string,
  token: string,
  fetchImpl: FetchLike,
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await (fetchImpl as unknown as typeof globalThis.fetch)(
      `${baseUrl}${path}`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function upstreamMap(config: BffConfig): Map<string, string> {
  const map = new Map<string, string>();

  for (const upstream of config.upstreams) {
    map.set(upstream.name, upstream.baseUrl);
  }

  return map;
}

export async function buildDashboard(
  request: FastifyRequest,
  reply: FastifyReply,
  options: DashboardServiceOptions,
): Promise<DashboardResponse | undefined> {
  const token = extractBearer(request);
  if (!token) {
    sendError(reply, 401, 'UNAUTHORIZED');
    return undefined;
  }

  const resolved = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!resolved) {
    return undefined;
  }

  const subjectId = resolved.payload.user.subject ?? deriveSubjectIdFromJwt(token);
  if (subjectId) {
    options.cache.set(subjectId, resolved.payload, options.config.meCacheTtlSeconds);
  }

  const access = resolveDashboardAccess(resolved.payload.permissions);
  const upstreams = upstreamMap(options.config);
  const result: DashboardResponse = {};
  const promises: Promise<void>[] = [];

  if (access.cadastro) {
    const cadastroUrl = upstreams.get('cadastro');
    if (cadastroUrl) {
      promises.push(
        fetchUpstream<CadastroResumo>(cadastroUrl, '/dashboard/resumo', token, options.fetchImpl).then(
          (data) => {
            result.cadastro = data;
          },
        ),
      );
    }
  }

  if (access.identificacao) {
    const identificacaoUrl = upstreams.get('identificacao');
    if (identificacaoUrl) {
      promises.push(
        fetchUpstream<IdentificacaoResumo>(
          identificacaoUrl,
          '/dashboard/resumo',
          token,
          options.fetchImpl,
        ).then((data) => {
          result.identificacao = data;
        }),
      );
    }
  }

  if (access.arrecadacao) {
    const arrecadacaoUrl = upstreams.get('arrecadacao');
    if (arrecadacaoUrl) {
      promises.push(
        fetchUpstream<ArrecadacaoResumo>(
          arrecadacaoUrl,
          '/dashboard/resumo',
          token,
          options.fetchImpl,
        ).then((data) => {
          result.arrecadacao = data;
        }),
      );
    }
  }

  if (access.distribuicao) {
    const distribuicaoUrl = upstreams.get('distribuicao');
    if (distribuicaoUrl) {
      promises.push(
        fetchUpstream<DistribuicaoResumo>(
          distribuicaoUrl,
          '/dashboard/resumo',
          token,
          options.fetchImpl,
        ).then((data) => {
          result.distribuicao = data;
        }),
      );
    }
  }

  await Promise.allSettled(promises);

  return result;
}
