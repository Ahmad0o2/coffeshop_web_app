# DevOps, CI/CD, and Container Setup

This document describes the DevOps baseline added to the repository for the Coffee Shop web app. It covers GitHub Actions CI, Docker images for the backend and frontend, local multi-service orchestration with Docker Compose, and the backend runtime checks added to support safer deployment.

## Scope of the Setup

The following infrastructure files were added:

- `.github/workflows/ci.yml`
- `server/Dockerfile`
- `server/.dockerignore`
- `client/Dockerfile`
- `client/nginx.conf`
- `client/.dockerignore`
- `docker-compose.yml`

The following backend runtime changes were added:

- `server/src/server.js`
- `server/src/app.js`

## GitHub Actions CI

The GitHub Actions workflow lives at `.github/workflows/ci.yml`.

### Trigger rules

The workflow runs on:

- every push to `main`
- every pull request targeting `main`

### Jobs

#### `test-server`

Runs on `ubuntu-latest` and executes:

```bash
cd server
npm ci
npm test
```

Purpose:

- installs backend dependencies from the lockfile
- runs the backend Vitest suite
- blocks merges if backend tests fail

#### `build-client`

Runs on `ubuntu-latest` and executes:

```bash
cd client
npm ci
npm run build
```

Purpose:

- installs frontend dependencies from the lockfile
- validates that the Vite production build succeeds
- catches build-time regressions before merging

## Backend Container

The backend image is defined in `server/Dockerfile`.

### Build design

- base image: `node:20-alpine`
- working directory: `/app`
- dependency installation: `npm ci --only=production`
- copied source: `src/`
- exposed port: `5000`
- startup command: `node src/server.js`

### Why this layout

- `node:20-alpine` keeps the image small
- `npm ci` uses the lockfile for reproducible installs
- production-only dependency install reduces image size
- the container starts the same entry point used in production mode locally

## Frontend Container

The frontend image is defined in `client/Dockerfile`.

### Build design

Stage 1: build

- base image: `node:20-alpine`
- installs dependencies with `npm ci`
- runs `npm run build`

Stage 2: serve

- base image: `nginx:alpine`
- copies `/app/dist` into `/usr/share/nginx/html`
- uses `client/nginx.conf` as the default site config
- exposes port `80`

### Why this layout

- multi-stage build keeps the final image lean
- Nginx serves static Vite assets efficiently
- SPA routing is handled at the web server level

## Nginx SPA Configuration

The frontend Nginx config lives in `client/nginx.conf`.

### Included behavior

- serves `index.html` as the main entry point
- uses `try_files` fallback for client-side routing
- applies long-lived cache headers to static assets
- enables gzip for common frontend asset types

### Routing behavior

This line is the key SPA fallback:

```nginx
try_files $uri $uri/ /index.html;
```

It ensures routes such as `/menu`, `/profile`, or `/admin` still load the React app when accessed directly in the browser.

## Docker Compose Stack

The local multi-container stack is defined in `docker-compose.yml`.

### Services

#### `mongodb`

- image: `mongo:7`
- port mapping: `27017:27017`
- named volume: `mongo-data`
- default database name: `coffeshop`

#### `server`

- build context: `./server`
- port mapping: `5000:5000`
- loads environment variables from `server/.env`
- overrides `MONGO_URI` to use the Docker network hostname:

```text
mongodb://mongodb:27017/coffeshop
```

- depends on `mongodb`

#### `client`

- build context: `./client`
- port mapping: `80:80`
- depends on `server`

### Start the stack

From the repository root:

```bash
docker compose up --build
```

### Stop the stack

```bash
docker compose down
```

### Remove containers and database volume

```bash
docker compose down -v
```

## Docker Ignore Rules

Both `server/.dockerignore` and `client/.dockerignore` exclude:

- `node_modules`
- `dist`
- `.env`
- `.git`
- `*.log`
- `dist-check`

This keeps build contexts smaller and prevents secrets or unnecessary local artifacts from being sent into Docker builds.

## Backend Environment Validation

Runtime validation was added in `server/src/server.js` immediately after `dotenv.config()`.

### Required environment variables

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

If any of them are missing, the server now:

- logs the missing keys
- exits with code `1`

This prevents the backend from booting in a half-configured state.

## Health Check Endpoint

The `/api/health` endpoint in `server/src/app.js` was upgraded to include application and database state.

### Current response shape

Successful database connection:

```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 123,
  "timestamp": "2026-03-21T11:30:00.000Z"
}
```

Degraded database connection:

```json
{
  "status": "degraded",
  "db": "disconnected",
  "uptime": 123,
  "timestamp": "2026-03-21T11:30:00.000Z"
}
```

### Status codes

- returns `200` when MongoDB is connected
- returns `503` when MongoDB is not connected

This makes the endpoint more useful for:

- reverse proxies
- uptime checks
- container orchestration probes
- external monitoring tools

## Environment Requirements for Docker Compose

The Compose setup expects a real `server/.env` file to exist locally.

At minimum, it should include:

```dotenv
JWT_SECRET=replace_me
CLIENT_ORIGIN=http://localhost
```

Notes:

- `MONGO_URI` in `server/.env` is overridden by Compose at runtime
- `CLIENT_ORIGIN` should match the frontend origin you expose in Docker
- for the current compose file, the frontend is exposed on `http://localhost`

## Verification Performed

The following checks were run after the DevOps setup was added:

### Backend

```bash
cd server
npm test
```

Result: passed

### Frontend

```bash
cd client
npm run build
```

Result: passed

## Operational Notes

- The current CI pipeline validates backend tests and frontend production builds.
- The current setup does not yet publish Docker images to a registry.
- The current setup does not yet deploy automatically to a hosting provider.
- If you later want full CD, the next natural step is to add image publishing and environment-specific deployment workflows.

## Recommended Next Step for Full CD

If deployment automation is needed later, add a second GitHub Actions workflow that:

1. builds versioned Docker images
2. pushes them to GitHub Container Registry or Docker Hub
3. deploys to the target platform after a successful `main` build

That keeps CI validation and CD rollout concerns cleanly separated.
