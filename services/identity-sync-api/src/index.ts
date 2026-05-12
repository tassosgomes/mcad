import { loadConfig } from './config.js';
import { LogtoManagementClient } from './logto.js';
import { RabbitMqIdentityEventPublisher } from './publisher.js';
import { buildServer } from './server.js';

const config = loadConfig();
const publisher = new RabbitMqIdentityEventPublisher(config.rabbitMqUrl, config.exchangeName);
const logtoClient =
  config.logtoManagementApi && config.logtoM2mClientId && config.logtoM2mClientSecret
    ? new LogtoManagementClient(
        config.logtoManagementApi,
        config.logtoM2mClientId,
        config.logtoM2mClientSecret,
      )
    : null;
const server = await buildServer(config, publisher, logtoClient);

await server.listen({ host: config.host, port: config.port });
