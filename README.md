# NestJS Cron Job Task API

A NestJS + MongoDB REST API for managing tasks and automatically expiring
overdue tasks via a distributed cron job that is safe to run across multiple
application instances.

## Features

- Task CRUD (`create`, `list`, `read`, `update`, `delete`) with DTO validation.
- MongoDB persistence via `@nestjs/mongoose`.
- A scheduled cron job that marks overdue `Pending` tasks as `Expired`.
- **Distributed locking** so only one instance runs the cron operation at a
  time, using an atomic MongoDB `findOneAndUpdate` upsert with lease expiry.
- Liveness (`/health`) and readiness (`/ready`) endpoints.
- Helmet, CORS allowlisting, request validation, graceful shutdown and
  process-level error logging.
- Strict environment validation with sensible defaults and numeric ranges.
- Docker, Docker Compose, GitHub Actions CI, and a pre-commit hook.

## Requirements

- Node.js 20+
- npm
- MongoDB 6+ (local, Docker, or Atlas)

## Setup

```bash
npm install
cp .env.example .env   # then edit the values
```

`npm install` also configures the repository's Git hooks (`core.hooksPath`
points at `.githooks`).

## Environment variables

Validated at startup with Joi. Invalid or missing required values stop the
application.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development`, `production` or `test`. |
| `PORT` | no | `3000` | HTTP port (1-65535). |
| `MONGODB_URI` | **yes** | - | `mongodb://` or `mongodb+srv://` connection string (never hardcoded). |
| `MONGODB_POOL_SIZE` | no | `10` | Max connection pool size (1-100). |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | no | `5000` | Server selection timeout. |
| `MONGODB_CONNECT_TIMEOUT_MS` | no | `10000` | Connection timeout. |
| `MONGODB_SOCKET_TIMEOUT_MS` | no | `45000` | Socket timeout. |
| `MONGODB_TLS` | no | `false` | Enable TLS. Certificate validation is always enforced. |
| `MONGODB_TLS_CA_FILE` | no | - | Optional CA file path used with TLS. |
| `CRON_SCHEDULE` | no | `0 * * * * *` | 6-field cron expression (includes seconds). |
| `CRON_TIMEZONE` | no | `UTC` | Timezone for the cron schedule. |
| `CRON_LOCK_TTL_SECONDS` | no | `30` | Distributed lock lease duration. |
| `CORS_ORIGIN` | production: **yes** | `*` | Comma-separated allowlist. `*` is rejected in production. |

## Running

```bash
npm run start        # one-off
npm run start:dev    # watch mode
npm run start:prod   # node dist/main
```

## API

Base URL: `http://localhost:3000`

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/health` | Liveness of the process. | `200` |
| `GET` | `/ready` | Readiness; `503` until MongoDB is available. | `200` / `503` |
| `POST` | `/tasks` | Create a task. Body: `{ "title": string, "expiresAt": ISO date }`. | `201` |
| `GET` | `/tasks` | List tasks. | `200` |
| `GET` | `/tasks/:id` | Get a task by id. | `200` / `400` / `404` |
| `PATCH` | `/tasks/:id` | Update `title`, `status` and/or `expiresAt`. | `200` / `400` / `404` |
| `DELETE` | `/tasks/:id` | Delete a task. | `200` / `400` / `404` |

Allowed `status` values: `Pending`, `In Progress`, `Expired`.

Example:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship it","expiresAt":"2026-12-31T23:59:59.000Z"}'
```

## Cron behavior

- Registered dynamically on startup using `CRON_SCHEDULE` / `CRON_TIMEZONE`.
- Each run acquires a distributed lock named `expire_tasks_cron` in the
  `cron_locks` collection of the application database.
- The lock document uses the lock name as its `_id`. Acquisition is a single
  atomic `findOneAndUpdate` upsert: if the document exists and has not expired,
  the upsert fails with a duplicate key error and the run is skipped.
- The lock has a lease (`CRON_LOCK_TTL_SECONDS`). A crashed instance stops
  renewing, so the lease expires and another instance takes over. A former
  owner can never release a newer owner's lock, because release is scoped to
  the owning instance id.
- Overdue `Pending` tasks are updated to `Expired`, and the lock is released in
  a `finally` block so a failed run does not block future executions.

## Tests

```bash
npm run test       # unit tests (Vitest)
npm run test:cov   # unit tests with coverage
npm run test:e2e   # e2e tests (require MongoDB, see MONGODB_URI)
```

Unit tests use mocked Mongoose models and an in-memory fake collection that
reproduces the atomic lock semantics, so lock contention and recovery are
tested without a live database. E2E tests require a running MongoDB.

## Lint and format

```bash
npm run lint          # oxlint (type-aware)
npm run format        # prettier --write
npm run format:check  # prettier --check
```

A pre-commit hook (`.githooks/pre-commit`) runs `lint` and `format:check`.

## Docker

```bash
docker build -t cron-job-task .
```

Or run the whole stack (API + MongoDB with persistent storage and health
checks):

```bash
docker compose up --build
```

The API is exposed on `http://localhost:3000`. Override `MONGODB_URI` and
`CORS_ORIGIN` for real environments.

## Deployment

This project has no configured hosting platform or deployment credentials in
the repository. The GitHub Actions workflow (`.github/workflows/ci.yml`) only
performs formatting, lint, build, unit tests and e2e tests against a MongoDB
service container.

To deploy, provide an external MongoDB (e.g. Atlas via `MONGODB_URI`), set a
production `CORS_ORIGIN` allowlist, and run the Docker image or
`npm run start:prod` behind your platform of choice. After deploying, verify:

- `GET /health` returns `200`
- `GET /ready` returns `200` once MongoDB is reachable

Note that the application waits for the initial MongoDB connection before it
starts listening, so orchestrators should ensure `MONGODB_URI` is reachable at
startup (the Docker health check on the API declares it healthy only once
`/health` responds). Once running, a MongoDB outage is reported by `/ready`
with an HTTP `503` while `/health` continues to report the process as alive.

## License

The licensing intent for this repository is **not yet decided**. The
`package.json` currently declares `"license": "UNLICENSED"` and the project is
private. A `LICENSE` file has deliberately not been added; clarification from
the owner is required before choosing a license.
