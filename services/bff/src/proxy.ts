import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { createHmac } from 'node:crypto';
import type { BffConfig, UpstreamConfig } from './config.js';
import {
  resolveAuthzContext,
  type FetchLike,
  type ResolvedAuthzContext,
} from './authzContext.js';

interface ProxyTarget {
  upstream: string;
  rewritePrefix: string;
}

interface UpstreamResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  stream: NodeJS.ReadableStream;
}

interface RegisterProxyOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

const aiRuntimeAuthorization = new WeakMap<object, ResolvedAuthzContext>();
const RUNTIME_AUTH_SIGNATURE_HEADER = 'x-mcad-runtime-auth-signature';
const RUNTIME_AUTH_TIMESTAMP_HEADER = 'x-mcad-runtime-auth-timestamp';

function resolveProxyTarget(baseUrl: string): ProxyTarget {
  const parsedUrl = new URL(baseUrl);
  const rewritePrefix = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');

  return {
    upstream: parsedUrl.origin,
    rewritePrefix,
  };
}

function buildTargetUrl(requestUrl: string, sourcePrefix: string, target: ProxyTarget): string {
  const parsedUrl = new URL(requestUrl, 'http://mcad-bff.local');
  const suffix = parsedUrl.pathname.startsWith(sourcePrefix)
    ? parsedUrl.pathname.slice(sourcePrefix.length)
    : parsedUrl.pathname;
  const path = `${target.rewritePrefix}${suffix || ''}` || '/';

  return `${target.upstream}${path}${parsedUrl.search}`;
}

function removeClientRuntimeHeaders(headers: Record<string, string | string[] | undefined>) {
  const sanitizedHeaders = { ...headers };

  delete sanitizedHeaders['x-mcad-roles'];
  delete sanitizedHeaders['x-mcad-permissions'];
  delete sanitizedHeaders['x-mcad-authz-version'];
  delete sanitizedHeaders['x-mcad-user-id'];
  delete sanitizedHeaders['x-mcad-user-name'];
  delete sanitizedHeaders['x-authz-version'];
  delete sanitizedHeaders[RUNTIME_AUTH_SIGNATURE_HEADER];
  delete sanitizedHeaders[RUNTIME_AUTH_TIMESTAMP_HEADER];

  return sanitizedHeaders;
}

function buildRuntimeAuthSignatureInput(
  context: ResolvedAuthzContext,
  requestId: string,
  timestamp: number,
): string {
  return JSON.stringify({
    requestId,
    userId: context.payload.user.id,
    displayName: context.payload.user.name?.trim() ?? '',
    permissions: context.payload.permissions,
    authzVersion: context.payload.version,
    timestamp,
  });
}

function signRuntimeAuthorization(
  context: ResolvedAuthzContext,
  requestId: string,
  timestamp: number,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(buildRuntimeAuthSignatureInput(context, requestId, timestamp))
    .digest('base64url');
}

function buildAiRuntimeHeaders(
  context: ResolvedAuthzContext,
  requestId: string,
  secret: string | undefined,
): Record<string, string> {
  if (!secret) {
    return {};
  }

  const displayName = context.payload.user.name?.trim();
  const timestamp = Date.now();

  return {
    'x-mcad-user-id': context.payload.user.id,
    ...(displayName ? { 'x-mcad-user-name': displayName } : {}),
    'x-mcad-permissions': context.payload.permissions.join(','),
    'x-mcad-authz-version': String(context.payload.version),
    [RUNTIME_AUTH_TIMESTAMP_HEADER]: String(timestamp),
    [RUNTIME_AUTH_SIGNATURE_HEADER]: signRuntimeAuthorization(context, requestId, timestamp, secret),
  };
}

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

      if (!shouldInjectAiAuthorization) {
        done();
        return;
      }

      void (async () => {
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
        const forwardedHost = request.headers['x-forwarded-host'] ?? request.headers.host;
        const forwardedProto = request.headers['x-forwarded-proto'] ?? request.protocol;
        const runtimeAuthorization = aiRuntimeAuthorization.get(request);
        const baseHeaders =
          shouldInjectAiAuthorization ? removeClientRuntimeHeaders(headers) : headers;

        return {
          ...baseHeaders,
          'x-forwarded-host': forwardedHost,
          'x-forwarded-proto': forwardedProto,
          'x-mcad-bff-upstream': upstreamConfig.name,
          'x-mcad-original-url': request.url,
          'x-mcad-request-id': request.id,
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
