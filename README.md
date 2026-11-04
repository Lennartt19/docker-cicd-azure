# docker-cicd-demo

API sencilla con Node.js + Express preparada para dockerizar. Incluye:

- Dockerfile multi-stage (imagen final ligera y sin usuario root).
- `docker-compose.yml` con `env_file`, healthcheck y reinicio automático.
- Validación de variables de entorno al arrancar.
- Endpoints de ejemplo para comprobar la inyección de configuración y secretos.

## Estructura

```
.
├── src/
│   ├── config.js        # Lectura y validación de variables de entorno
│   └── server.js        # Servidor Express y endpoints
├── .env.example         # Plantilla de variables (sí se versiona)
├── .env                 # Tus valores reales (NO se versiona)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Requisitos

- Node.js 20+ (solo para ejecución local)
- Docker 24+ y Docker Compose v2

## Ejecución local (sin Docker)

```bash
cp .env.example .env   # ajusta los valores, sobre todo API_KEY
npm install
npm run dev
```

La API quedará en `http://localhost:3000`.

## Ejecución con Docker Compose

```bash
cp .env.example .env   # solo la primera vez
docker compose up -d --build
docker compose logs -f
```

La API quedará en `http://localhost:8091` (según `HOST_PORT`).

Para detenerla:

```bash
docker compose down
```

## Ejecución solo con Docker

```bash
docker build -t docker-cicd-demo:local .
docker run --rm -p 8091:3000 --env-file .env docker-cicd-demo:local
```

## Variables de entorno

| Variable       | Obligatoria | Por defecto            | Descripción                                                        |
| -------------- | ----------- | ---------------------- | ------------------------------------------------------------------ |
| `PORT`         | No          | `3000`                 | Puerto interno donde escucha la aplicación.                        |
| `HOST_PORT`    | No          | `8091`                 | Puerto publicado en tu máquina (solo lo usa Compose).              |
| `NODE_ENV`     | No          | `production`           | Entorno de ejecución (`development`, `production`, `test`).        |
| `APP_NAME`     | No          | `docker-cicd-demo`     | Nombre mostrado por la API.                                        |
| `APP_GREETING` | No          | `Hola desde Docker`    | Mensaje devuelto en la ruta raíz.                                  |
| `API_KEY`      | **Sí**      | —                      | Secreto usado por el endpoint protegido `/secure`.                 |
| `LOG_LEVEL`    | No          | `info`                 | Nivel de log: `debug`, `info`, `warn` o `error`.                   |

Si falta `API_KEY` o un valor no es válido, la aplicación falla al arrancar con un mensaje claro.

> **Importante:** `.env` está en `.gitignore` y en `.dockerignore`. Nunca subas secretos reales al repositorio ni los incluyas en la imagen. En CI/CD, inyecta las variables desde el sistema de secretos del proveedor.

## Endpoints

| Método | Ruta      | Descripción                                                        |
| ------ | --------- | ------------------------------------------------------------------ |
| GET    | `/`       | Mensaje de bienvenida con nombre de app y entorno.                 |
| GET    | `/health` | Estado de salud usado por el healthcheck de Docker.                |
| GET    | `/config` | Configuración no sensible (la API key aparece enmascarada).        |
| GET    | `/secure` | Requiere la cabecera `x-api-key` con el valor de `API_KEY`.        |

### Ejemplos

```bash
curl http://localhost:8091/health
curl http://localhost:8091/config
curl -H "x-api-key: clave-de-desarrollo-cambiar-en-produccion" http://localhost:8091/secure
```

## Notas

- `HOST_PORT` permite cambiar el puerto del host sin reconstruir la imagen. Si está ocupado, cámbialo en `.env` (por ejemplo, a `8092`).
- El contenedor se ejecuta como usuario `app` (sin privilegios de root).
- El apagado es ordenado: `SIGTERM`/`SIGINT` cierran el servidor HTTP correctamente.
