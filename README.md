# docker-cicd-demo

API sencilla con Node.js + Express preparada para dockerizar. Incluye:

- Dockerfile multi-stage (imagen final ligera y sin usuario root).
- `docker-compose.yml` con `env_file`, healthcheck y reinicio automático.
- Validación de variables de entorno al arrancar.
- Endpoints de ejemplo para comprobar la inyección de configuración y secretos.
- Tests automatizados y pipeline de GitHub Actions que publica en ACR y despliega en Azure Web App.

## Estructura

```
.
├── src/
│   ├── app.js           # Rutas y middlewares de Express
│   ├── config.js        # Lectura y validación de variables de entorno
│   └── server.js        # Arranque y apagado ordenado del servidor
├── test/
│   └── app.test.js      # Tests con el runner nativo de Node
├── .github/
│   └── workflows/
│       └── ci-cd.yml    # Pipeline de GitHub Actions
├── .env.example         # Plantilla de variables (sí se versiona)
├── .env                 # Tus valores reales (NO se versiona)
├── dockerfile
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
| `APP_VERSION`  | No          | `dev`                  | Versión desplegada; se expone en `/`, `/health` y `/config`.       |
| `API_KEY`      | **Sí**      | —                      | Secreto usado por el endpoint protegido `/secure`.                 |
| `LOG_LEVEL`    | No          | `info`                 | Nivel de log: `debug`, `info`, `warn` o `error`.                   |

Si falta `API_KEY` o un valor no es válido, la aplicación falla al arrancar con un mensaje claro.

> **Importante:** `.env` está en `.gitignore` y en `.dockerignore`. Nunca subas secretos reales al repositorio ni los incluyas en la imagen. En CI/CD, inyecta las variables desde el sistema de secretos del proveedor.

## Endpoints

| Método | Ruta      | Descripción                                                        |
| ------ | --------- | ------------------------------------------------------------------ |
| GET    | `/`       | Mensaje de bienvenida con nombre, versión y entorno de la app.     |
| GET    | `/health` | Estado de salud y versión desplegada (usado por el despliegue).    |
| GET    | `/config` | Configuración no sensible (la API key aparece enmascarada).        |
| GET    | `/secure` | Requiere la cabecera `x-api-key` con el valor de `API_KEY`.        |

### Ejemplos

```bash
curl http://localhost:8091/health
curl http://localhost:8091/config
curl -H "x-api-key: clave-de-desarrollo-cambiar-en-produccion" http://localhost:8091/secure
```

## Pipeline de GitHub Actions y despliegue en Azure

El workflow `.github/workflows/ci-cd.yml` se ejecuta en cada push y pull request hacia `main`, y también manualmente con `workflow_dispatch`.

| Job       | Cuándo se ejecuta  | Qué hace                                                                  |
| --------- | ------------------ | ------------------------------------------------------------------------- |
| `test`    | Siempre            | `npm ci`, tests con `node --test` y auditoría informativa de dependencias. |
| `build`   | Tras `test`        | Construye la imagen Docker y la escanea con Trivy (HIGH/CRITICAL).         |
| `publish` | Solo push a `main` | Publica la imagen en Azure Container Registry (ACR).                      |
| `deploy`  | Solo push a `main` | Actualiza la imagen de Azure Web App y verifica `/health`.                |

### Imágenes publicadas en ACR

En cada push a `main` se generan estas etiquetas:

```text
lennart19.azurecr.io/lennartt19/docker-cicd-azure:sha-<commit-corto>
lennart19.azurecr.io/lennartt19/docker-cicd-azure:latest
```

El job `deploy` usa siempre el tag `sha-<commit-corto>`, no `latest`. Así Azure detecta un cambio de imagen real y no reutiliza una versión cacheada.

```bash
az acr login --name lennart19
docker pull lennart19.azurecr.io/lennartt19/docker-cicd-azure:latest
```

### Recursos de Azure

| Recurso                 | Nombre                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Resource group          | `docker-cicd`                                                 |
| Azure Container Registry | `lennart19.azurecr.io`                                       |
| App Service Plan        | `ASP-dockercicd-bfbc` (Linux, B1)                             |
| Web App                 | `docker-cicd-app`                                             |
| URL pública             | `https://docker-cicd-app-ahcramdrf6d8gdg0.chilecentral-01.azurewebsites.net` |
| Identidad administrada  | `docker-github-cicd` con `AcrPull` sobre el ACR y `Website Contributor` sobre la Web App |

La Web App descarga la imagen usando su identidad administrada (`acrUseManagedIdentityCreds=true`), por lo que **no se guardan contraseñas ni PAT del registro** en GitHub.

### Secrets y variables de GitHub

Secrets necesarios para el login OIDC con Azure:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Variables opcionales (el workflow ya trae estos valores por defecto):

- `AZURE_WEBAPP_NAME` → `docker-cicd-app`
- `AZURE_RESOURCE_GROUP` → `docker-cicd`

### Configuración de la Web App

Estas variables deben existir como *Application settings* en Azure:

| Setting         | Valor                            |
| --------------- | -------------------------------- |
| `WEBSITES_PORT` | `3000`                           |
| `PORT`          | `3000`                           |
| `NODE_ENV`      | `production`                     |
| `APP_NAME`      | `docker-cicd-demo`               |
| `APP_GREETING`  | `Hola desde Azure Web App`       |
| `LOG_LEVEL`     | `info`                           |
| `APP_VERSION`   | Lo define el job `deploy` (`sha-<commit>`) |
| `API_KEY`       | Secreto definido solo en Azure   |

> `APP_VERSION` la actualiza el pipeline en cada despliegue con el tag inmutable de la imagen. El job `deploy` espera a que `/health` devuelva exactamente esa versión antes de dar el despliegue por bueno.
>
> Para comprobarlo manualmente:
>
> ```bash
> curl https://docker-cicd-app-ahcramdrf6d8gdg0.chilecentral-01.azurewebsites.net/health
> ```

> `API_KEY` no está en el repositorio. Para rotarla:
>
> ```bash
> az webapp config appsettings set -g docker-cicd -n docker-cicd-app \
>   --settings API_KEY="nueva-clave-segura"
> ```

### Badge de estado (opcional)

Sustituye `OWNER/REPO` y añade esta línea al README:

```markdown
![CI/CD](https://github.com/OWNER/REPO/actions/workflows/ci-cd.yml/badge.svg)
```

### Probar el pipeline en local

```bash
npm ci
npm test
docker build -t docker-cicd-demo:local .
```

> Para producción, considera fijar cada action a un commit SHA en lugar de un tag mayor, y activar las reglas de protección de rama para exigir que el job `test` pase antes de hacer merge.

## Notas

- `HOST_PORT` permite cambiar el puerto del host sin reconstruir la imagen. Si está ocupado, cámbialo en `.env` (por ejemplo, a `8092`).
- El contenedor se ejecuta como usuario `app` (sin privilegios de root).
- El apagado es ordenado: `SIGTERM`/`SIGINT` cierran el servidor HTTP correctamente.
