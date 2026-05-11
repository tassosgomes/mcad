import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import type { UpstreamConfig } from './config.js';

interface ProxyTarget {
  upstream: string;
  rewritePrefix: string;
}

interface UpstreamResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  stream: NodeJS.ReadableStream;
}

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

export async function registerProxy(
  server: FastifyInstance,
  upstreamConfig: UpstreamConfig,
): Promise<void> {
  const target = resolveProxyTarget(upstreamConfig.baseUrl);

  await server.register(httpProxy, {
    upstream: target.upstream,
    prefix: upstreamConfig.prefix,
    rewritePrefix: target.rewritePrefix,
    http2: false,
    preHandler: (request, _reply, done) => {
      request.log.info(
        {
          upstream: upstreamConfig.name,
          method: request.method,
          url: request.url,
          target: buildTargetUrl(request.url, upstreamConfig.prefix, target),
        },
        'bff proxy request',
      );
      done();
    },
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => {
        const forwardedHost = request.headers['x-forwarded-host'] ?? request.headers.host;
        const forwardedProto = request.headers['x-forwarded-proto'] ?? request.protocol;

        return {
          ...headers,
          'x-forwarded-host': forwardedHost,
          'x-forwarded-proto': forwardedProto,
          'x-mcad-bff-upstream': upstreamConfig.name,
          'x-mcad-original-url': request.url,
          'x-mcad-request-id': request.id,
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
