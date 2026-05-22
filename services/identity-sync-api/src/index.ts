import { pino } from 'pino';
import { loadConfig } from './config.js';
import { LogtoManagementClient } from './logto.js';
import { RabbitMqIdentityEventPublisher } from './publisher.js';
import { createSyncScheduler } from './scheduler.js';
import { buildServer } from './server.js';

const config = loadConfig();
const logger = pino({ name: 'mcad-identity-sync-api' });

const publisher = new RabbitMqIdentityEventPublisher(config.rabbitMqUrl, config.exchangeName);
const logtoClient = new LogtoManagementClient(
  config.logtoManagementApi,
  config.logtoM2mClientId,
  config.logtoM2mClientSecret,
  { pageSize: config.logtoPageSize },
);

const scheduler = config.schedulerEnabled
  ? createSyncScheduler(logtoClient, publisher, {
      intervalMs: config.syncIntervalMs,
      runOnStartup: config.syncOnStartup,
      logger,
    })
  : null;

const server = await buildServer(config, {
  publisher,
  logtoUsers: logtoClient,
  scheduler,
});

server.addHook('onClose', async () => {
  await scheduler?.stop();
  await publisher.close();
});

const shutdown = async (signal: string) => {
  server.log.info({ signal }, 'shutdown_initiated');
  try {
    await server.close();
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await server.listen({ host: config.host, port: config.port });

if (scheduler) {
  await scheduler.start();
}
