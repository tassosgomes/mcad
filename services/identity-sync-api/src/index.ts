import { loadConfig } from './config.js';
import { RabbitMqIdentityEventPublisher } from './publisher.js';
import { buildServer } from './server.js';

const config = loadConfig();
const publisher = new RabbitMqIdentityEventPublisher(config.rabbitMqUrl, config.exchangeName);
const server = await buildServer(config, publisher);

await server.listen({ host: config.host, port: config.port });
