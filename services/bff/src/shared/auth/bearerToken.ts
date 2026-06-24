import type { FastifyRequest } from 'fastify';

export function extractBearer(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;

  if (!header || typeof header !== 'string') {
    return undefined;
  }

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }

  const token = trimmed.slice('bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

/**
 * Tries to extract JWT `sub` without validating the signature. This is used
 * only as a local cache key; the real token validation belongs to ecad-authz.
 */
export function deriveSubjectIdFromJwt(token: string): string | undefined {
  const parts = token.split('.');
  if (parts.length < 2) return undefined;

  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as { sub?: unknown };

    if (typeof parsed.sub === 'string' && parsed.sub.length > 0) {
      return parsed.sub;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
