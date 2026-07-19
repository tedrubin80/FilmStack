# Technical overview

Architecture notes for FilmStack / FestScout (self-hosted, AGPL-3.0).

## Monorepo map

```
filmstack/
├── apps/
│   ├── festival-api/      # Express + TypeScript — festival domain API (:3001)
│   ├── festival-web/      # Vite + React — festival UI + instance homepage (:3000)
│   ├── streaming-api/     # Express + JS — video / streaming API (:3002)
│   └── streaming-web/     # Vite + React — streaming UI (:3003)
├── packages/
│   ├── shared-auth/       # Shared auth helpers
│   ├── shared-config/     # Shared config
│   ├── shared-db/         # Prisma / DB access
│   └── shared-types/      # Shared TypeScript types
├── docker-compose.yml     # Full stack: Postgres, Redis, APIs, webs
├── railway.toml           # Self-hosted / Railway hints
└── vercel.json            # Optional festival-web preview
```

## Runtime topology

| Service | Port | Role |
|---------|------|------|
| festival-web | 3000 | Instance landing + festival app |
| festival-api | 3001 | Tenants, festivals, films, judges, payments, awards, video rooms |
| streaming-api | 3002 | Uploads, transcode, playback, playlists, comments |
| streaming-web | 3003 | Viewer / creator streaming UI |
| PostgreSQL 16 | 5432 | Shared database |
| Redis 7 | 6379 | Cache, sessions, rate limits, queues |

Marketing is a separate repo: [feststackmarketing](https://github.com/tedrubin80/feststackmarketing). CTAs use `VITE_APP_URL` pointing at a festival-web instance.

## Auth and tenancy

- Festival API uses JWT access + refresh tokens and CSRF protection.
- Multi-tenant model: organizations register with a **subdomain**; users belong to a tenant.
- Platform-admin routes live under `/api/platform-admin`.
- Streaming API has its own auth middleware; bridge routes connect festival ↔ streaming where needed (`/api/bridge`, `festivalBridge`).

## Festival API surface (high level)

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login, register, session |
| `/api/tenants` | Tenant management |
| `/api/festivals` | Festival CRUD / program |
| `/api/films` | Submissions |
| `/api/judges` | Judging panels |
| `/api/payments` | Stripe entry fees |
| `/api/awards` | Awards / certificates |
| `/api/video-rooms` | Live screening / Q&A rooms |
| `/api/emails` | Email templates |
| `/health` | Health check |

## Streaming API surface (high level)

Uploads, videos, films, playlists, comments, ratings, search, subscriptions, waivers, CDN helpers, admin, analytics, recommendations, notifications.

## Storage

- **Local disk only** (`UPLOAD_PATH`, default `./uploads`).
- No AWS S3 or cloud object-store credentials in the default stack.
- Optional Bunny.net CDN for delivery (`USE_CDN`, `BUNNY_*`, `CDN_HOSTNAME`).
- Transcode pipeline: local FFmpeg processing; CDN upload when configured, otherwise local files.

## Data

- Shared Postgres via `DATABASE_URL`.
- Schema / migrations live under shared-db (Prisma). Use `npm run db:migrate` from the monorepo root when developing outside Compose.

## Frontends

- **festival-web `/`**: instance homepage for self-hosted installs (sign in / create account). Not a SaaS marketing funnel.
- **[feststackmarketing](https://github.com/tedrubin80/feststackmarketing)**: public product / pricing story; links out to `VITE_APP_URL`.

## Deploy

- **Docker Compose**: primary self-host path (`INSTALL.md`).
- **Railway**: see root `railway.toml`; one service per Dockerfile or Compose.
- **Vercel**: root `vercel.json` can preview festival-web; marketing deploys from the feststackmarketing repo.

## License implications

AGPL-3.0: if you modify the software and run it as a network service, you must offer corresponding source to users of that service. See `LICENSE`.
