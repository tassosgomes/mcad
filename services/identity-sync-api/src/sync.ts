import { buildIdentityEvent, type IdentityUserEvent } from './events.js';
import type { LogtoUser, LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';

export interface SyncResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  published: number;
  skipped: number;
  error: string | null;
}

export async function syncLogtoUsers(
  importer: LogtoUserImporter,
  publisher: IdentityEventPublisher,
): Promise<SyncResult> {
  const startedAt = new Date();
  let fetched = 0;
  let published = 0;
  let skipped = 0;
  let error: string | null = null;

  try {
    const users = await importer.listUsers();
    fetched = users.length;
    for (const user of users) {
      const event = buildEventFromLogtoUser(user);
      if (!event) {
        skipped++;
        continue;
      }
      await publisher.publish(event);
      published++;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const finishedAt = new Date();
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    fetched,
    published,
    skipped,
    error,
  };
}

function buildEventFromLogtoUser(user: LogtoUser): IdentityUserEvent | null {
  const payload = {
    event: 'User.Data.Updated',
    createdAt: new Date().toISOString(),
    user,
  };
  const body = Buffer.from(JSON.stringify(payload));
  return buildIdentityEvent(payload, body);
}
