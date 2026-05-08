import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import type { UpstreamConfig } from './config.js';

interface ProxyTarget {
  upstream: string;
  rewritePrefix: string;
}

function resolveProxyTarget(baseUrl: string): ProxyTarget {
  const parsedUrl = new URL(baseUrl);
  const rewritePrefix = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');

  return {
    upstream: parsedUrl.origin,
    rewritePrefix,
  };
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
    replyOptions: {
      rewriteRequestHeaders: (_request, headers) => ({
        ...headers,
        'x-mcad-bff-upstream': upstreamConfig.name,
      }),
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
