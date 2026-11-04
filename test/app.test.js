import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

// Se define antes de importar la app: dotenv no sobrescribe variables existentes.
process.env.API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.APP_VERSION = 'test-version';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
}));

test('GET /health devuelve estado ok y la versión desplegada', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.version, 'test-version');
});

test('GET / incluye el nombre y la versión de la app', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.app, 'docker-cicd-demo');
  assert.equal(body.version, 'test-version');
  assert.equal(body.environment, 'test');
});

test('GET /secure rechaza peticiones sin API key', async () => {
  const response = await fetch(`${baseUrl}/secure`);

  assert.equal(response.status, 401);
});

test('GET /secure acepta la API key correcta', async () => {
  const response = await fetch(`${baseUrl}/secure`, {
    headers: { 'x-api-key': 'test-api-key' },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});

test('GET /config enmascara la API key', async () => {
  const response = await fetch(`${baseUrl}/config`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.apiKey, 'tes***');
  assert.equal(body.nodeEnv, 'test');
  assert.equal(body.appVersion, 'test-version');
});

test('una ruta desconocida devuelve 404', async () => {
  const response = await fetch(`${baseUrl}/no-existe`);

  assert.equal(response.status, 404);
});
