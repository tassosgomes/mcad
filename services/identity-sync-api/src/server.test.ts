import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { IdentitySyncConfig } from './config.js';
import type { IdentityUserEvent } from './events.js';
import type { LogtoUser, LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';
import { buildServer } from './server.js';

const config: IdentitySyncConfig = {
  host: '127.0.0.1',
  port: 0,
  webhookSigningKey: 'test-signing-key',
  syncAdminToken: 'sync-token',
  logtoM2mClientId: null,
  logtoM2mClientSecret: null,
  logtoManagementApi: null,
  rabbitMqUrl: 'amqp://guest:guest@localhost:5672/',
  exchangeName: 'identity.events',
  requestBodyLimitBytes: 1024 * 1024,
};

class MemoryPublisher implements IdentityEventPublisher {
  events: IdentityUserEvent[] = [];

  async publish(event: IdentityUserEvent): Promise<void> {
    this.events.push(event);
  }

  async ready(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}

class MemoryLogtoImporter implements LogtoUserImporter {
  constructor(private readonly users: LogtoUser[]) {}

  async listUsers(): Promise<LogtoUser[]> {
    return this.users;
  }
}

test('accepts signed Logto webhook and publishes identity event', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, publisher);
  const payload = {
    hookId: 'hook_123',
    event: 'User.Data.Updated',
    createdAt: '2026-05-08T12:00:00.000Z',
    user: {
      id: 'logto-user-1',
      username: 'analista_arrecadacao',
      name: 'Analista Arrecadacao',
      primaryEmail: 'analista@mcad.dev',
      avatar: 'https://example.test/avatar.png',
      roles: [{ name: 'analista-arrecadacao' }],
      isSuspended: false,
    },
  };
  const body = JSON.stringify(payload);

  const response = await server.inject({
    method: 'POST',
    url: '/webhooks/logto',
    headers: {
      'content-type': 'application/json',
      'logto-signature-sha-256': sign(body),
    },
    payload: body,
  });

  assert.equal(response.statusCode, 202);
  assert.equal(publisher.events.length, 1);
  assert.equal(publisher.events[0]?.eventType, 'identity.user.upserted');
  assert.equal(publisher.events[0]?.user.logtoUserId, 'logto-user-1');
  assert.equal(publisher.events[0]?.user.displayName, 'Analista Arrecadacao');
  assert.deepEqual(publisher.events[0]?.user.roles, ['analista-arrecadacao']);

  await server.close();
});

test('rejects webhook with invalid signature', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, publisher);

  const response = await server.inject({
    method: 'POST',
    url: '/webhooks/logto',
    headers: {
      'content-type': 'application/json',
      'logto-signature-sha-256': 'bad-signature',
    },
    payload: JSON.stringify({ event: 'PostSignIn', user: { id: 'u1' } }),
  });

  assert.equal(response.statusCode, 401);
  assert.equal(publisher.events.length, 0);

  await server.close();
});

test('maps suspended and deleted Logto events to dedicated identity events', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, publisher);

  for (const payload of [
    { event: 'User.SuspensionStatus.Updated', user: { id: 'u1', isSuspended: true } },
    { event: 'User.Deleted', userId: 'u2' },
  ]) {
    const body = JSON.stringify(payload);
    await server.inject({
      method: 'POST',
      url: '/webhooks/logto',
      headers: {
        'content-type': 'application/json',
        'logto-signature-sha-256': sign(body),
      },
      payload: body,
    });
  }

  assert.deepEqual(publisher.events.map((event) => event.eventType), [
    'identity.user.suspended',
    'identity.user.deleted',
  ]);

  await server.close();
});

test('syncs current Logto users and publishes identity events', async () => {
  const publisher = new MemoryPublisher();
  const importer = new MemoryLogtoImporter([
    {
      id: 'logto-user-1',
      username: 'analista_arrecadacao',
      name: 'Analista Arrecadacao',
      primaryEmail: 'analista_arrecadacao@mcad.dev',
      roles: [{ name: 'analista-arrecadacao' }],
      isSuspended: false,
    },
  ]);
  const server = await buildServer(config, publisher, importer);

  const response = await server.inject({
    method: 'POST',
    url: '/sync/logto/users',
    headers: {
      'x-sync-admin-token': 'sync-token',
    },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.json().published, 1);
  assert.equal(publisher.events[0]?.eventType, 'identity.user.upserted');
  assert.deepEqual(publisher.events[0]?.user.roles, ['analista-arrecadacao']);

  await server.close();
});

test('rejects Logto user sync without admin token', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, publisher, new MemoryLogtoImporter([]));

  const response = await server.inject({
    method: 'POST',
    url: '/sync/logto/users',
  });

  assert.equal(response.statusCode, 401);
  assert.equal(publisher.events.length, 0);

  await server.close();
});

function sign(body: string): string {
  return createHmac('sha256', config.webhookSigningKey).update(Buffer.from(body)).digest('hex');
}
