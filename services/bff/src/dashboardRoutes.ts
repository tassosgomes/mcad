import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import type { MeCache } from './meCache.js';
import { extractBearer, deriveSubjectIdFromJwt, resolveAuthzContext, sendError, type FetchLike } from './authzContext.js';

export interface DashboardRoutesOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl?: FetchLike;
}

// ── Permission constants matching frontend widget visibility checks ──
const PERM_CADASTRO = 'cadastro:default:associacao:listar';
const PERM_IDENTIFICACAO = 'identificacao:default:captacao:listar';
const PERM_ARRECADACAO = 'arrecadacao:default:cliente:listar';
const PERM_DISTRIBUICAO_RUBRICA = 'distribuicao:default:rubrica:listar';
const PERM_DISTRIBUICAO_PROCESSO = 'distribuicao:default:processo:listar';

interface DashboardAlerta {
  tipo: string;
  mensagem: string;
}

interface CadastroResumo {
  totalObras: number;
  totalFonogramas: number;
  totalTitulares: number;
  totalAssociacoes: number;
  alertas: DashboardAlerta[];
}

interface IdentificacaoResumo {
  taxaMatch: number;
  totalPendentes: number;
  captacoesAtivas: number;
  ultimoLoteDescricao: string | null;
  alertas: DashboardAlerta[];
}

interface ArrecadacaoResumo {
  arrecadacaoMes: number;
  totalLicencasAtivas: number;
  totalLicencasSuspensas: number;
  verbaLiquidaEstimada: number;
  alertas: DashboardAlerta[];
}

interface DistribuicaoResumo {
  statusUltimoCiclo: string;
  totalRepassado: number;
  creditosRetidos: number;
  rubricasAtivas: number;
  alertas: DashboardAlerta[];
}

interface DashboardResponse {
  cadastro?: CadastroResumo | null;
  identificacao?: IdentificacaoResumo | null;
  arrecadacao?: ArrecadacaoResumo | null;
  distribuicao?: DistribuicaoResumo | null;
}

const UPSTREAM_TIMEOUT_MS = 5000;

function hasPermission(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}

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

export async function registerDashboardRoutes(
  server: FastifyInstance,
  options: DashboardRoutesOptions,
): Promise<void> {
  const { config, cache } = options;
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  // Resolve upstream base URLs from config
  const upstreamMap = new Map<string, string>();
  for (const upstream of config.upstreams) {
    upstreamMap.set(upstream.name, upstream.baseUrl);
  }

  server.get('/api/me/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearer(request);
    if (!token) {
      sendError(reply, 401, 'UNAUTHORIZED');
      return;
    }

    // Resolve authorization context to get user permissions
    const resolved = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!resolved) {
      return; // resolveAuthzContext already sent the error
    }

    const { permissions } = resolved.payload;

    // Cache the context for future requests
    const subjectId = resolved.payload.user.subject ?? deriveSubjectIdFromJwt(token);
    if (subjectId) {
      cache.set(subjectId, resolved.payload, config.meCacheTtlSeconds);
    }

    // Determine which domains the user has access to
    const hasCadastro = hasPermission(permissions, PERM_CADASTRO);
    const hasIdentificacao = hasPermission(permissions, PERM_IDENTIFICACAO);
    const hasArrecadacao = hasPermission(permissions, PERM_ARRECADACAO);
    const hasDistribuicao =
      hasPermission(permissions, PERM_DISTRIBUICAO_RUBRICA) ||
      hasPermission(permissions, PERM_DISTRIBUICAO_PROCESSO);

    // Build parallel fetch promises only for authorized domains
    const result: DashboardResponse = {};
    const promises: Promise<void>[] = [];

    if (hasCadastro) {
      const cadastroUrl = upstreamMap.get('cadastro');
      if (cadastroUrl) {
        promises.push(
          fetchUpstream<CadastroResumo>(cadastroUrl, '/dashboard/resumo', token, fetchImpl).then(
            (data) => {
              result.cadastro = data;
            },
          ),
        );
      }
    }

    if (hasIdentificacao) {
      const identificacaoUrl = upstreamMap.get('identificacao');
      if (identificacaoUrl) {
        promises.push(
          fetchUpstream<IdentificacaoResumo>(
            identificacaoUrl,
            '/dashboard/resumo',
            token,
            fetchImpl,
          ).then((data) => {
            result.identificacao = data;
          }),
        );
      }
    }

    if (hasArrecadacao) {
      const arrecadacaoUrl = upstreamMap.get('arrecadacao');
      if (arrecadacaoUrl) {
        promises.push(
          fetchUpstream<ArrecadacaoResumo>(
            arrecadacaoUrl,
            '/dashboard/resumo',
            token,
            fetchImpl,
          ).then((data) => {
            result.arrecadacao = data;
          }),
        );
      }
    }

    if (hasDistribuicao) {
      const distribuicaoUrl = upstreamMap.get('distribuicao');
      if (distribuicaoUrl) {
        promises.push(
          fetchUpstream<DistribuicaoResumo>(
            distribuicaoUrl,
            '/dashboard/resumo',
            token,
            fetchImpl,
          ).then((data) => {
            result.distribuicao = data;
          }),
        );
      }
    }

    // Execute all fetches in parallel
    await Promise.allSettled(promises);

    return reply.code(200).send(result);
  });

  server.log.info('registered dashboard aggregation route: GET /api/me/dashboard');
}
