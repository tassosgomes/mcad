import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { normalizeHeaderValue } from '../http/headers.js';
import type { AuditScreenOperation } from './screenAuditCatalog.js';

export const AUDIT_HEADER_NAMES = [
  'x-audit-screen-access-id',
  'x-audit-screen-id',
  'x-audit-screen-name',
  'x-audit-route',
  'x-audit-session-id',
  'x-audit-command-id',
  'x-session-id',
];

export function removeClientAuditHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const sanitizedHeaders = { ...headers };

  for (const headerName of AUDIT_HEADER_NAMES) {
    delete sanitizedHeaders[headerName];
  }

  return sanitizedHeaders;
}

export function buildAuditHeaders(
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

export function addAuditResponseHeaders(
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
