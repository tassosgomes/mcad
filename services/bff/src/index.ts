import { loadConfig } from './config/config.js';
import { buildServer } from './app/buildServer.js';

const config = loadConfig();
const server = await buildServer(config);

try {
  const address = await server.listen({
    host: config.host,
    port: config.port,
  });

  server.log.info({ address }, 'mcad bff started');
} catch (error) {
  server.log.error(error, 'failed to start mcad bff');
  process.exit(1);
}
