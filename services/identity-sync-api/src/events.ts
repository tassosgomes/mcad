import { createHash } from 'node:crypto';

export type IdentityEventType =
  | 'identity.user.upserted'
  | 'identity.user.suspended'
  | 'identity.user.deleted';

export interface IdentityUserSnapshot {
  logtoUserId: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  roles: string[];
  isSuspended: boolean;
  raw: Record<string, unknown>;
}

export interface IdentityUserEvent {
  eventId: string;
  eventType: IdentityEventType;
  occurredAt: string;
  source: {
    provider: 'logto';
    event: string;
    hookId: string | null;
  };
  user: IdentityUserSnapshot;
  metadata: {
    payloadHash: string;
  };
}

type UnknownRecord = Record<string, unknown>;

export function buildIdentityEvent(payload: unknown, rawBody: Buffer): IdentityUserEvent | null {
  if (!isRecord(payload)) {
    throw new Error('Webhook payload must be a JSON object');
  }

  const event = readString(payload.event);
  if (!event) {
    throw new Error('Webhook payload missing event');
  }

  const extractedUser = extractUser(payload);
  const dataRecord = readRecord(payload.data);
  const logtoUserId =
    readString(extractedUser?.id) ??
    readString(payload.userId) ??
    readString(dataRecord?.userId) ??
    readString(dataRecord?.id);
  if (!logtoUserId) {
    return null;
  }
  const user = extractedUser ?? (dataRecord && readString(dataRecord.id) ? dataRecord : { id: logtoUserId });

  const payloadHash = createHash('sha256').update(rawBody).digest('hex');
  const eventType = resolveIdentityEventType(event, user);
  const occurredAt = readString(payload.createdAt) ?? new Date().toISOString();

  return {
    eventId: createHash('sha256')
      .update(`${event}:${occurredAt}:${logtoUserId}:${payloadHash}`)
      .digest('hex'),
    eventType,
    occurredAt,
    source: {
      provider: 'logto',
      event,
      hookId: readString(payload.hookId),
    },
    user: {
      logtoUserId,
      username: readString(user.username),
      displayName: readString(user.name),
      email: readString(user.primaryEmail),
      avatarUrl: readString(user.avatar),
      roles: extractRoles(user),
      isSuspended: readBoolean(user.isSuspended) ?? event === 'User.SuspensionStatus.Updated',
      raw: user,
    },
    metadata: {
      payloadHash,
    },
  };
}

function resolveIdentityEventType(event: string, user: UnknownRecord): IdentityEventType {
  if (event === 'User.Deleted' || event.toLowerCase().includes('delete')) {
    return 'identity.user.deleted';
  }

  if (event === 'User.SuspensionStatus.Updated' && readBoolean(user.isSuspended) === true) {
    return 'identity.user.suspended';
  }

  return 'identity.user.upserted';
}

function extractUser(payload: UnknownRecord): UnknownRecord | null {
  const directUser = readRecord(payload.user);
  if (directUser) return directUser;

  const data = readRecord(payload.data);
  return readRecord(data?.user);
}

function extractRoles(user: UnknownRecord): string[] {
  const roles = user.roles;
  if (!Array.isArray(roles)) return [];

  return roles
    .map((role) => {
      if (typeof role === 'string') return role;
      if (isRecord(role)) return readString(role.name);
      return null;
    })
    .filter((role): role is string => Boolean(role));
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
