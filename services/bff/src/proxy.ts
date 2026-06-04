import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { createHmac, randomUUID } from 'node:crypto';
import type { BffConfig, UpstreamConfig } from './config.js';
import {
  resolveAuthzContext,
  type FetchLike,
  type ResolvedAuthzContext,
} from './authzContext.js';
import { publishAuditEvent } from './auditoria/auditEventPublisher.js';
import { buildScreenAccessEvent, type ScreenAccessActor } from './auditoria/screenAccessEventBuilder.js';
import { classifyScreenAuditRequest } from './auditoria/screenAuditClassifier.js';
import type { AuditScreenOperation } from './auditoria/screenAuditCatalog.js';

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
const AUDIT_RESPONSE_NOT_JSON = 'AUDIT_RESPONSE_NOT_JSON';
const AUDIT_RESPONSE_TOO_LARGE = 'AUDIT_RESPONSE_TOO_LARGE';
const AUDIT_UNAVAILABLE = 'AUDIT_UNAVAILABLE';
const JSON_CONTENT_TYPE_PATTERN = /(^|\/|\+)json($|;)/i;
const AUDITED_UPSTREAM_NAMES = new Set([
  'cadastro',
  'arrecadacao',
  'identificacao',
  'distribuicao',
]);
const AUDIT_HEADER_NAMES = [
  'x-audit-screen-access-id',
  'x-audit-screen-id',
  'x-audit-screen-name',
  'x-audit-route',
  'x-audit-session-id',
  'x-audit-command-id',
  'x-session-id',
];
const RESPONSE_HEADER_BLOCKLIST = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

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

function buildUpstreamRoute(requestUrl: string, sourcePrefix: string, target: ProxyTarget): string {
  const parsedUrl = new URL(buildTargetUrl(requestUrl, sourcePrefix, target));

  return `${parsedUrl.pathname}${parsedUrl.search}`;
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

function removeClientAuditHeaders(headers: Record<string, string | string[] | undefined>) {
  const sanitizedHeaders = { ...headers };

  for (const headerName of AUDIT_HEADER_NAMES) {
    delete sanitizedHeaders[headerName];
  }

  return sanitizedHeaders;
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0);
  }

  return value?.trim() || undefined;
}

function toFetchHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    const normalizedValue = Array.isArray(value) ? value.join(',') : value;

    if (normalizedValue !== undefined) {
      output[name] = normalizedValue;
    }
  }

  return output;
}

function responseHeaders(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries());
}

function isJsonContentType(contentType: string | null): boolean {
  return Boolean(contentType && JSON_CONTENT_TYPE_PATTERN.test(contentType));
}

function sendProxyError(reply: FastifyReply, status: number, code: string): void {
  reply.code(status).send({ code });
}

async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<{ buffer: Buffer; exceeded: boolean }> {
  const contentLength = response.headers.get('content-length');

  if (contentLength && Number(contentLength) > maxBytes) {
    return {
      buffer: Buffer.alloc(0),
      exceeded: true,
    };
  }

  const reader = response.body?.getReader();

  if (!reader) {
    return {
      buffer: Buffer.alloc(0),
      exceeded: false,
    };
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      return {
        buffer: Buffer.alloc(0),
        exceeded: true,
      };
    }

    chunks.push(Buffer.from(value));
  }

  return {
    buffer: Buffer.concat(chunks, totalBytes),
    exceeded: false,
  };
}

async function readResponseBody(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

function copyUpstreamResponseHeaders(reply: FastifyReply, response: Response): void {
  for (const [name, value] of response.headers.entries()) {
    if (!RESPONSE_HEADER_BLOCKLIST.has(name.toLowerCase())) {
      reply.header(name, value);
    }
  }
}

function buildAuditHeaders(
  request: FastifyRequest,
  operation: AuditScreenOperation,
): Record<string, string> {
  return {
    'x-audit-screen-access-id': randomUUID(),
    'x-audit-screen-id': operation.id,
    'x-audit-screen-name': operation.friendlyName,
    'x-audit-route': request.url,
    'x-audit-session-id': randomUUID(),
    'x-audit-command-id': randomUUID(),
  };
}

function addAuditResponseHeaders(
  reply: FastifyReply,
  auditHeaders: Record<string, string>,
  request: FastifyRequest,
): void {
  for (const [name, value] of Object.entries(auditHeaders)) {
    reply.header(name, value);
  }

  const traceparent = normalizeHeaderValue(request.headers.traceparent);

  if (traceparent) {
    reply.header('traceparent', traceparent);
  }
}

function buildActor(context: ResolvedAuthzContext): ScreenAccessActor {
  return {
    id: context.payload.user.id,
    subject: context.payload.user.subject,
    email: context.payload.user.email,
    name: context.payload.user.name,
    roles: context.payload.roles,
    authProvider: 'ecad-authz',
  };
}

function shouldAuditScreenAccess(upstreamConfig: UpstreamConfig, request: FastifyRequest): boolean {
  return request.method === 'GET' && AUDITED_UPSTREAM_NAMES.has(upstreamConfig.name);
}

function mergeForwardHeaders(
  request: FastifyRequest,
  headers: Record<string, string | string[] | undefined>,
  upstreamName: string,
): Record<string, string> {
  const forwardedHost = request.headers['x-forwarded-host'] ?? request.headers.host;
  const forwardedProto = request.headers['x-forwarded-proto'] ?? request.protocol;

  return toFetchHeaders({
    ...removeClientAuditHeaders(headers),
    'x-forwarded-host': forwardedHost,
    'x-forwarded-proto': forwardedProto,
    'x-mcad-bff-upstream': upstreamName,
    'x-mcad-original-url': request.url,
    'x-mcad-request-id': request.id,
  });
}

async function handleAuditedScreenAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamConfig: UpstreamConfig,
  target: ProxyTarget,
  options: RegisterProxyOptions,
  fetchImpl: FetchLike,
): Promise<boolean> {
  if (!shouldAuditScreenAccess(upstreamConfig, request)) {
    return false;
  }

  const classification = classifyScreenAuditRequest({
    method: request.method,
    path: request.url,
    screenIdHint: normalizeHeaderValue(request.headers['x-audit-screen-id']),
  });

  if (
    !classification.operation
    || (classification.level !== 'SILVER' && classification.level !== 'GOLD')
  ) {
    return false;
  }

  const resolvedAuthz = await resolveAuthzContext(request, reply, options, fetchImpl);

  if (!resolvedAuthz) {
    return true;
  }

  const auditHeaders = buildAuditHeaders(request, classification.operation);
  const targetUrl = buildTargetUrl(request.url, upstreamConfig.prefix, target);
  const upstreamRoute = buildUpstreamRoute(request.url, upstreamConfig.prefix, target);
  const proxyFetch = (options.fetchImpl ?? globalThis.fetch) as unknown as typeof globalThis.fetch;
  const upstreamResponse = await proxyFetch(targetUrl, {
    method: request.method,
    headers: {
      ...mergeForwardHeaders(request, request.headers, upstreamConfig.name),
      ...auditHeaders,
      ...(normalizeHeaderValue(request.headers.traceparent)
        ? { traceparent: normalizeHeaderValue(request.headers.traceparent) as string }
        : {}),
    },
  });
  const responseHeadersRecord = responseHeaders(upstreamResponse);

  if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
    const body = await readResponseBody(upstreamResponse);

    copyUpstreamResponseHeaders(reply, upstreamResponse);
    reply.code(upstreamResponse.status);
    reply.send(body);
    return true;
  }

  const contentType = upstreamResponse.headers.get('content-type');

  if (!isJsonContentType(contentType)) {
    request.log.warn(
      {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
        contentType,
      },
      'audit.screen_access.non_json_response',
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_NOT_JSON);
    return true;
  }

  const { buffer, exceeded } = await readResponseBodyWithLimit(
    upstreamResponse,
    options.config.auditScreenAccessMaxResponseBytes,
  );

  if (exceeded) {
    request.log.warn(
      {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
        maxBytes: options.config.auditScreenAccessMaxResponseBytes,
      },
      'audit.screen_access.response_too_large',
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_TOO_LARGE);
    return true;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(buffer.toString('utf8'));
  } catch {
    request.log.warn(
      {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
      },
      'audit.screen_access.invalid_json_response',
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_NOT_JSON);
    return true;
  }

  const event = buildScreenAccessEvent({
    request: {
      headers: {
        ...request.headers,
        ...auditHeaders,
      },
      id: request.id,
      ip: request.ip,
      method: request.method,
      url: request.url,
    },
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor: buildActor(resolvedAuthz),
    auditLevel: classification.level,
    upstream: {
      name: upstreamConfig.name,
      route: upstreamRoute,
      statusCode: upstreamResponse.status,
      headers: responseHeadersRecord,
      body: parsedBody,
      responseBytes: buffer.byteLength,
      capturedAtUtc: new Date().toISOString(),
    },
    screenAccessId: auditHeaders['x-audit-screen-access-id'],
  });

  try {
    await publishAuditEvent(event, {
      auditBaseUrl: options.config.auditBaseUrl,
      auditTimeoutMs: options.config.auditTimeoutMs,
      fetchImpl: options.fetchImpl as Parameters<typeof publishAuditEvent>[1]['fetchImpl'],
      log: request.log,
    });
  } catch (error) {
    request.log.error(
      {
        upstream: upstreamConfig.name,
        screenId: classification.operation.id,
        level: classification.level,
        err: error,
      },
      'audit.screen_access.fail_closed',
    );
    sendProxyError(reply, 503, AUDIT_UNAVAILABLE);
    return true;
  }

  copyUpstreamResponseHeaders(reply, upstreamResponse);
  addAuditResponseHeaders(reply, auditHeaders, request);
  reply.code(upstreamResponse.status);
  reply.send(buffer);
  return true;
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
