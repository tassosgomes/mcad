export interface ProxyTarget {
  upstream: string;
  rewritePrefix: string;
}

export function resolveProxyTarget(baseUrl: string): ProxyTarget {
  const parsedUrl = new URL(baseUrl);
  const rewritePrefix = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');

  return {
    upstream: parsedUrl.origin,
    rewritePrefix,
  };
}

export function buildTargetUrl(requestUrl: string, sourcePrefix: string, target: ProxyTarget): string {
  const parsedUrl = new URL(requestUrl, 'http://mcad-bff.local');
  const suffix = parsedUrl.pathname.startsWith(sourcePrefix)
    ? parsedUrl.pathname.slice(sourcePrefix.length)
    : parsedUrl.pathname;
  const path = `${target.rewritePrefix}${suffix || ''}` || '/';

  return `${target.upstream}${path}${parsedUrl.search}`;
}

export function buildUpstreamRoute(requestUrl: string, sourcePrefix: string, target: ProxyTarget): string {
  const parsedUrl = new URL(buildTargetUrl(requestUrl, sourcePrefix, target));

  return `${parsedUrl.pathname}${parsedUrl.search}`;
}
