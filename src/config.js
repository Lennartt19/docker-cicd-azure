import 'dotenv/config';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Falta la variable de entorno obligatoria "${name}". ` +
        'Copia .env.example a .env y define su valor.'
    );
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function toPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT debe ser un número entre 1 y 65535. Valor recibido: "${value}"`);
  }
  return port;
}

function toLogLevel(value) {
  const level = value.toLowerCase();
  if (!LOG_LEVELS.includes(level)) {
    throw new Error(
      `LOG_LEVEL inválido: "${value}". Valores permitidos: ${LOG_LEVELS.join(', ')}`
    );
  }
  return level;
}

export const config = Object.freeze({
  port: toPort(optional('PORT', '3000')),
  nodeEnv: optional('NODE_ENV', 'development'),
  appName: optional('APP_NAME', 'docker-cicd-demo'),
  appGreeting: optional('APP_GREETING', 'Hola desde Docker'),
  appVersion: optional('APP_VERSION', 'dev'),
  apiKey: required('API_KEY'),
  logLevel: toLogLevel(optional('LOG_LEVEL', 'info')),
});

export function log(level, message, extra) {
  const levels = { debug: 10, info: 20, warn: 30, error: 40 };
  if (levels[level] < levels[config.logLevel]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  };
  console.log(JSON.stringify(entry));
}
