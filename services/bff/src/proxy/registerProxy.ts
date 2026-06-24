import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import type { BffConfig, UpstreamConfig } from '../config/config.js';
import {
  resolveAuthzContext,
  type FetchLike,
  type ResolvedAuthzContext,
} from '../shared/auth/authzContext.js';
import type { AuditMetricsRegistry } from '../shared/audit/auditMetrics.js';
import { handleAuditedScreenAccess } from './auditedProxy.js';
import { buildForwardHeaders } from './proxyHeaders.js';
import {
  buildTargetUrl,
  resolveProxyTarget,
} from './proxyTarget.js';
import {
  buildAiRuntimeHeaders,
  removeClientRuntimeHeaders,
} from './runtimeAuth.js';

interface UpstreamResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  stream: NodeJS.ReadableStream;
}

export interface RegisterProxyOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
  auditMetrics?: AuditMetricsRegistry;
}

const aiRuntimeAuthorization = new WeakMap<object, ResolvedAuthzContext>();

export async function registerProxy(
  server: FastifyInstance,
  upstreamConfig: UpstreamConfig,
  options: RegisterProxyOptions,
): Promise<void> {
  const target = resolveProxyTarget(upstreamConfig.baseUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const shouldInjectAiAuthorization = upstreamConfig.name === 'ai';

  await server.register(httpProxy, {
    upstream: target.upstream,
    prefix: upstreamConfig.prefix,
    rewritePrefix: target.rewritePrefix,
    http2: false,
    preHandler: (request, reply, done) => {
      request.log.info(
        {
          upstream: upstreamConfig.name,
          method: request.method,
          url: request.url,
          target: buildTargetUrl(request.url, upstreamConfig.prefix, target),
        },
        'bff proxy request',
      );

      void (async () => {
        const auditedScreenAccessHandled = await handleAuditedScreenAccess(
          request,
          reply,
          upstreamConfig,
          target,
          options,
          fetchImpl,
        );

        if (auditedScreenAccessHandled) {
          return;
        }

        if (!shouldInjectAiAuthorization) {
          done();
          return;
        }

        const resolvedAuthz = await resolveAuthzContext(request, reply, options, fetchImpl);

        if (!resolvedAuthz) {
          return;
        }

        aiRuntimeAuthorization.set(request, resolvedAuthz);
        done();
      })().catch(done);
    },
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => {
        const runtimeAuthorization = aiRuntimeAuthorization.get(request);
        const baseHeaders = shouldInjectAiAuthorization
          ? removeClientRuntimeHeaders(headers)
          : headers;

        return {
          ...buildForwardHeaders(request, baseHeaders, upstreamConfig.name),
          ...(runtimeAuthorization
            ? buildAiRuntimeHeaders(runtimeAuthorization, request.id, options.config.aiRuntimeAuthSecret)
            : {}),
        };
      },
      rewriteHeaders: (headers, request) => ({
        ...headers,
        'x-mcad-bff-upstream': upstreamConfig.name,
        'x-mcad-request-id': request?.id ?? '',
      }),
      onResponse: (request, reply, response) => {
        const upstreamResponse = response as unknown as UpstreamResponse;
        const contentType = upstreamResponse.headers['content-type'];
        const contentLength = upstreamResponse.headers['content-length'];
        const logPayload = {
          upstream: upstreamConfig.name,
          statusCode: upstreamResponse.statusCode,
          method: request.method,
          url: request.url,
          target: buildTargetUrl(request.url, upstreamConfig.prefix, target),
          contentType,
          contentLength,
        };

        if (upstreamResponse.statusCode >= 500) {
          request.log.error(logPayload, 'bff upstream server error');
        } else if (upstreamResponse.statusCode >= 400) {
          request.log.warn(logPayload, 'bff upstream client error');
        } else {
          request.log.info(logPayload, 'bff upstream response');
        }

        reply.send(upstreamResponse.stream);
      },
    },
  });

  server.log.info(
    {
      upstream: upstreamConfig.name,
      prefix: upstreamConfig.prefix,
      target: upstreamConfig.baseUrl,
    },
    'registered bff proxy route',
  );
}
