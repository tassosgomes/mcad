import { removeClientAuditHeaders } from '../shared/audit/auditHeaders.js';
import { toFetchHeaders } from '../shared/http/headers.js';

interface ProxyHeaderRequest {
  headers: Record<string, string | string[] | undefined>;
  protocol: string;
  url: string;
  id: string;
}

export function buildForwardHeaders(
  request: ProxyHeaderRequest,
  headers: Record<string, string | string[] | undefined>,
  upstreamName: string,
): Record<string, string | string[] | undefined> {
  const forwardedHost = request.headers['x-forwarded-host'] ?? request.headers.host;
  const forwardedProto = request.headers['x-forwarded-proto'] ?? request.protocol;

  return {
    ...headers,
    'x-forwarded-host': forwardedHost,
    'x-forwarded-proto': forwardedProto,
    'x-mcad-bff-upstream': upstreamName,
    'x-mcad-original-url': request.url,
    'x-mcad-request-id': request.id,
  };
}

export function buildAuditedFetchHeaders(
  request: ProxyHeaderRequest,
  headers: Record<string, string | string[] | undefined>,
  upstreamName: string,
): Record<string, string> {
  return toFetchHeaders(buildForwardHeaders(request, removeClientAuditHeaders(headers), upstreamName));
}
