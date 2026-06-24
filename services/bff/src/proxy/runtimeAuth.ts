import { createHmac } from 'node:crypto';
import type { ResolvedAuthzContext } from '../shared/auth/authzContext.js';

export const RUNTIME_AUTH_SIGNATURE_HEADER = 'x-mcad-runtime-auth-signature';
export const RUNTIME_AUTH_TIMESTAMP_HEADER = 'x-mcad-runtime-auth-timestamp';

export function removeClientRuntimeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
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

export function buildAiRuntimeHeaders(
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
