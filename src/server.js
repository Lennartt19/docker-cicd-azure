import app from './app.js';
import { config, log } from './config.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  log('info', 'server_started', {
    app: config.appName,
    environment: config.nodeEnv,
    port: config.port,
  });
});

// Apagado ordenado para que Docker no mate el proceso a la fuerza.
function shutdown(signal) {
  log('info', 'shutdown_requested', { signal });
  server.close(() => {
    log('info', 'server_closed');
    process.exit(0);
  });

  setTimeout(() => {
    log('error', 'shutdown_forced');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
