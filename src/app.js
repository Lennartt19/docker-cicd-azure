import express from 'express';
import { config, log } from './config.js';

const app = express();
const startedAt = Date.now();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Middleware de logging básico.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: config.appGreeting,
    app: config.appName,
    version: config.appVersion,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para el healthcheck de Docker/Compose.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: config.appVersion,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Muestra la configuración no sensible para comprobar la inyección de variables.
app.get('/config', (req, res) => {
  res.json({
    port: config.port,
    nodeEnv: config.nodeEnv,
    appName: config.appName,
    appGreeting: config.appGreeting,
    appVersion: config.appVersion,
    logLevel: config.logLevel,
    apiKey: `${config.apiKey.slice(0, 3)}***`,
  });
});

// Ejemplo de endpoint protegido por una variable de entorno secreta.
app.get('/secure', (req, res) => {
  const providedKey = req.header('x-api-key');

  if (!providedKey || providedKey !== config.apiKey) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }

  res.json({ ok: true, message: 'Acceso concedido con la API key del entorno' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default app;
