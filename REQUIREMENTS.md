# Requirements

Runtime and optional dependencies for FilmStack / FestScout.

## Required

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 20.0.0 | APIs and Vite frontends |
| npm | ≥ 10 | Workspaces / package manager |
| PostgreSQL | 16 | Primary database (shared) |
| Redis | 7 | Cache, sessions, queues |
| Docker Engine + Compose v2 | current stable | Recommended full-stack install |

OS: any Linux, macOS, or Windows (WSL2) environment that can run Docker and Node 20.

Disk: allow several GB for Docker images, Postgres data, and video uploads if you use streaming.

## Required secrets (environment)

Must be set before production use (see `.env.example`):

- `DB_PASSWORD` / `DATABASE_URL`
- `REDIS_PASSWORD` / `REDIS_URL`
- `JWT_SECRET` (≥ 32 characters)
- `JWT_REFRESH_SECRET` (different from `JWT_SECRET`)
- `CSRF_SECRET` (≥ 32 characters)

## Optional services

| Dependency | Used for |
|------------|----------|
| Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | Entry fees / payments |
| Resend (`RESEND_API_KEY`, `FROM_EMAIL`) | Transactional email |
| Local disk (`UPLOAD_PATH`) | Festival and video file storage |
| Bunny.net (`BUNNY_*`, `CDN_HOSTNAME`, `USE_CDN`) | Optional CDN delivery |
| Sentry (`SENTRY_DSN`) | Error monitoring |
| FFmpeg | Local video processing (streaming-api / `config/ffmpeg`) |

The platform runs without optional services; features that depend on them stay inactive until configured.

## Browser support (frontends)

Modern evergreen browsers: latest Chrome, Firefox, Safari, Edge. JavaScript must be enabled.

## Network ports (default)

| Port | Service |
|------|---------|
| 3000 | festival-web |
| 3001 | festival-api |
| 3002 | streaming-api |
| 3003 | streaming-web |
| 5173 | marketing (dev only) |
| 5432 | PostgreSQL |
| 6379 | Redis |

Compose binds DB/Redis to `127.0.0.1` by default. Expose them only if you know you need remote access.
