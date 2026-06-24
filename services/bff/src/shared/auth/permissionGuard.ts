import type { FastifyReply } from 'fastify';
import { sendError } from '../http/errors.js';

export function hasPermission(permissions: readonly string[], permission: string): boolean {
  return permissions.includes(permission);
}

export function requirePermission(
  reply: FastifyReply,
  permissions: readonly string[],
  permission: string,
  message = 'Permission denied',
): boolean {
  if (hasPermission(permissions, permission)) {
    return true;
  }

  sendError(reply, 403, 'FORBIDDEN', message);
  return false;
}
