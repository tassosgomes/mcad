import test from 'node:test';
import assert from 'node:assert/strict';
import type { IdentitySyncConfig } from './config.js';
import type { IdentityUserEvent } from './events.js';
import type { LogtoUser, LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';
import { createSyncScheduler } from './scheduler.js';
import { buildServer } from './server.js';

const config: IdentitySyncConfig = {
  host: '127.0.0.1',
  port: 0,
  syncAdminToken: 'sync-token',
  logtoM2mClientId: 'm2m-id',
  logtoM2mClientSecret: 'm2m-secret',
  logtoManagementApi: 'https://logto.test/api',
  rabbitMqUrl: 'amqp://guest:guest@localhost:5672/',
  exchangeName: 'identity.events',
  requestBodyLimitBytes: 1024 * 1024,
  schedulerEnabled: false,
  syncIntervalMs: 5 * 60 * 1000,
  syncOnStartup: false,
  logtoPageSize: 100,
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

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

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
  const server = await buildServer(config, { publisher, logtoUsers: importer });

  const response = await server.inject({
    method: 'POST',
    url: '/sync/logto/users',
    headers: { 'x-sync-admin-token': 'sync-token' },
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.json().published, 1);
  assert.equal(publisher.events[0]?.eventType, 'identity.user.upserted');
  assert.deepEqual(publisher.events[0]?.user.roles, ['analista-arrecadacao']);

  await server.close();
});

test('rejects manual sync without admin token', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, {
    publisher,
    logtoUsers: new MemoryLogtoImporter([]),
  });

  const response = await server.inject({ method: 'POST', url: '/sync/logto/users' });

  assert.equal(response.statusCode, 401);
  assert.equal(publisher.events.length, 0);

  await server.close();
});

test('manual sync delegates to scheduler when present (mutex shared)', async () => {
  const publisher = new MemoryPublisher();
  const importer = new MemoryLogtoImporter([
    {
      id: 'logto-user-2',
      username: 'consultor_dev',
      name: 'Consultor Dev',
      primaryEmail: 'consultor.dev@mcad.local',
      roles: [],
      isSuspended: false,
    },
  ]);
  const scheduler = createSyncScheduler(importer, publisher, {
    intervalMs: 60_000,
    runOnStartup: false,
    logger: silentLogger,
  });
  const server = await buildServer(config, {
    publisher,
    logtoUsers: importer,
    scheduler,
  });

  const response = await server.inject({
    method: 'POST',
    url: '/sync/logto/users',
    headers: { 'x-sync-admin-token': 'sync-token' },
  });
  assert.equal(response.statusCode, 202);
  assert.equal(scheduler.lastResult()?.published, 1);

  const status = await server.inject({ method: 'GET', url: '/sync/status' });
  assert.equal(status.statusCode, 200);
  assert.equal(status.json().schedulerEnabled, true);
  assert.equal(status.json().lastRun.published, 1);

  await scheduler.stop();
  await server.close();
});

test('sync/status with no scheduler returns disabled', async () => {
  const publisher = new MemoryPublisher();
  const server = await buildServer(config, {
    publisher,
    logtoUsers: new MemoryLogtoImporter([]),
  });

  const response = await server.inject({ method: 'GET', url: '/sync/status' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().schedulerEnabled, false);
  assert.equal(response.json().lastRun, null);

  await server.close();
});

test('maps suspended Logto users to dedicated identity events', async () => {
  const publisher = new MemoryPublisher();
  const importer = new MemoryLogtoImporter([
    {
      id: 'logto-user-3',
      username: 'usuario_suspenso',
      name: 'Suspenso',
      primaryEmail: 'suspenso@mcad.dev',
      isSuspended: true,
      roles: [],
    },
  ]);
  const server = await buildServer(config, { publisher, logtoUsers: importer });

  await server.inject({
    method: 'POST',
    url: '/sync/logto/users',
    headers: { 'x-sync-admin-token': 'sync-token' },
  });

  assert.equal(publisher.events[0]?.user.isSuspended, true);
  // Sync sempre usa User.Data.Updated como evento-fonte → upserted é o eventType.
  // O consumer no ecad-authz traduz isSuspended=true para UserStatus.INACTIVE.
  assert.equal(publisher.events[0]?.eventType, 'identity.user.upserted');

  await server.close();
});
