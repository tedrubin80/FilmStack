# Install

How to run FilmStack / FestScout on your machine or a server.

## Requirements

See [REQUIREMENTS.md](REQUIREMENTS.md) for the full list. Minimum:

- Node.js **≥ 20**
- npm **≥ 10** (comes with Node 20+)
- Docker + Docker Compose **v2** (recommended for full stack)
- PostgreSQL **16** and Redis **7** (provided by Compose, or install yourself)

## 1. Clone and configure

```bash
git clone <your-repo-url> filmstack
cd filmstack
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Notes |
|----------|--------|
| `DB_PASSWORD` | Strong password |
| `REDIS_PASSWORD` | Strong password |
| `JWT_SECRET` | ≥ 32 chars; generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Different from `JWT_SECRET` |
| `CSRF_SECRET` | ≥ 32 chars |

Also set `DATABASE_URL` and `REDIS_URL` to match those passwords (examples are in `.env.example`).

Optional: Stripe, Resend, Bunny CDN, Sentry. Uploads use local disk (`UPLOAD_PATH`). The stack starts without optional services.

## 2. Docker Compose (recommended)

```bash
docker compose up -d
```

This starts Postgres, Redis, festival-api, streaming-api, festival-web, and streaming-web.

### Ports

| Port | Service |
|------|---------|
| 3000 | Festival web (instance homepage) |
| 3001 | Festival API |
| 3002 | Streaming API |
| 3003 | Streaming web |
| 5432 | PostgreSQL (localhost only) |
| 6379 | Redis (localhost only) |

Health check: `curl http://localhost:3001/health`

Stop:

```bash
docker compose down
```

Data volumes (`postgres_data`, `redis_data`, `uploads_data`) persist across restarts.

## 3. Local development (npm / Turbo)

Use this when you want hot reload on the apps.

### Infrastructure only

```bash
docker compose up -d postgres redis
```

### Install and run

```bash
npm install
npm run dev
```

Turbo starts the workspace apps. Point URLs in `.env` at local ports (`FESTIVAL_URL=http://localhost:3000`, etc.).

Useful scripts (from repo root):

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev servers via Turbo |
| `npm run build` | Build all packages/apps |
| `npm run lint` | Typecheck / lint |
| `npm run db:migrate` | Run DB migrations |
| `npm run db:seed` | Seed data (if configured) |

## 4. Marketing site (optional)

Not required to run a festival instance. Lives in a **separate repo**:

[https://github.com/tedrubin80/feststackmarketing](https://github.com/tedrubin80/feststackmarketing)

```bash
git clone https://github.com/tedrubin80/feststackmarketing.git
cd feststackmarketing
cp .env.example .env
# Set VITE_APP_URL to your festival-web URL
npm install
npm run dev
```

Default marketing dev port: **5173**.

## 5. Deploy

- **Self-hosted / Railway:** see root [`railway.toml`](railway.toml) and [`docker-compose.yml`](docker-compose.yml)
- **Festival web preview on Vercel:** see root [`vercel.json`](vercel.json)
- **Marketing:** deploy from [feststackmarketing](https://github.com/tedrubin80/feststackmarketing)

Do not commit `.env` or real secrets.

## First login

1. Open http://localhost:3000
2. Use **Create account** on the instance homepage to register a tenant/admin
3. Sign in and open the dashboard

If registration is disabled in your fork, create the first user via your seed/migration path (see [TECHNICAL.md](TECHNICAL.md)).
