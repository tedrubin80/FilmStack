# FestScout

**Open-source film festival management you run yourself.**

FestScout handles submissions, judging, payments, awards, and live screening rooms in one stack. Self-host it. Keep your data. Share improvements under the same license.

| | |
|---|---|
| **Product name** | FestScout |
| **Monorepo name** | FilmStack |
| **License** | [AGPL-3.0](LICENSE) |
| **Stack** | Node 20+, Postgres 16, Redis 7, Docker Compose |
| **Default ports** | `3000`–`3003` (apps), `5432` (Postgres), `6379` (Redis) |

---

## Table of contents

- [Why FestScout](#why-festscout)
- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Quick start (Docker)](#quick-start-docker)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [First login](#first-login)
- [Instance homepage vs marketing site](#instance-homepage-vs-marketing-site)
- [APIs at a glance](#apis-at-a-glance)
- [Storage and media](#storage-and-media)
- [Deployment](#deployment)
- [Nginx examples](#nginx-examples)
- [Scripts](#scripts)
- [Documentation index](#documentation-index)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap notes](#roadmap-notes)

---

## Why FestScout

Most festival software is closed SaaS. FestScout is built to be **self-hosted open source**:

- Run a full festival (call for entries → judging → awards → live rooms) on your own server
- Multi-tenant organizations (subdomain per festival org)
- Built-in live video (screening rooms, filmmaker Q&As, panels), not a bolted-on third-party widget
- Local disk storage by default (no AWS account required)
- Separate marketing site so public product pages are not mixed into your instance UI

**FilmStack** is the monorepo / package name. **FestScout** is the product name in user-facing copy.

---

## Features

### Festival side (`festival-api` + `festival-web`)

- **Tenants / orgs** — register with a subdomain; users belong to a tenant
- **Festivals** — create and manage programs, categories, deadlines
- **Submissions** — filmmaker uploads, metadata, status tracking
- **Judging** — panels, scoring, conflict-of-interest controls
- **Payments** — optional Stripe entry fees
- **Awards** — issue awards and certificates
- **Email templates** — transactional / festival communications (Resend optional)
- **Live video rooms** — screening rooms and Q&As inside the platform
- **Platform admin** — cross-tenant admin routes
- **Instance homepage** — self-hosted landing at `/` (sign in / create account), not a SaaS sales funnel

### Streaming side (`streaming-api` + `streaming-web`)

- Video upload and processing (FFmpeg when available)
- Playback, playlists, comments, ratings, search
- Subscriptions, notifications, waivers
- Optional Bunny.net CDN
- Bridge routes to connect streaming ↔ festival where needed

### Marketing (`marketing/`)

- Standalone Vite site for public product / pricing storytelling
- CTAs point at your live instance via `VITE_APP_URL`
- Deploy separately (Vercel-friendly)

---

## Architecture

```text
                    ┌─────────────────────────┐
                    │  marketing/ (optional)  │
                    │  Vercel / static host   │
                    │  CTAs → VITE_APP_URL    │
                    └───────────┬─────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     Self-hosted instance                     │
│                                                              │
│   festival-web :3000  ←→  festival-api :3001                 │
│   streaming-web :3003 ←→  streaming-api :3002                │
│              │                      │                        │
│              └──────────┬───────────┘                        │
│                         ▼                                    │
│              PostgreSQL :5432  +  Redis :6379                │
│              Local uploads (UPLOAD_PATH)                     │
└──────────────────────────────────────────────────────────────┘
```

| Service | Port | Role |
|---------|------|------|
| `festival-web` | 3000 | Instance UI + homepage |
| `festival-api` | 3001 | Festival domain API |
| `streaming-api` | 3002 | Video / streaming API |
| `streaming-web` | 3003 | Streaming UI |
| PostgreSQL 16 | 5432 | Shared database (localhost-bound in Compose) |
| Redis 7 | 6379 | Cache, sessions, rate limits (localhost-bound in Compose) |

Shared packages: `shared-auth`, `shared-config`, `shared-db` (Prisma), `shared-types`.

For a deeper map, see [TECHNICAL.md](TECHNICAL.md).

---

## Repository layout

```text
filmstack/
├── apps/
│   ├── festival-api/          # Express + TypeScript API
│   ├── festival-web/          # Vite + React festival UI
│   ├── streaming-api/         # Express + JavaScript API
│   └── streaming-web/         # Vite + React streaming UI
├── packages/
│   ├── shared-auth/
│   ├── shared-config/
│   ├── shared-db/             # Prisma schema / migrations
│   └── shared-types/
├── marketing/                 # Standalone marketing site (not in npm workspaces)
├── nginx/                     # Generic reverse-proxy examples
├── docker-compose.yml         # Full stack
├── railway.toml               # Self-host / Railway hints
├── vercel.json                # Optional festival-web preview
├── .env.example               # Required + optional env template
├── LICENSE                    # AGPL-3.0
├── INSTALL.md
├── REQUIREMENTS.md
├── TECHNICAL.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── CHANGELOG.md
```

---

## Quick start (Docker)

**Prerequisites:** Docker Engine + Compose v2. Full requirements: [REQUIREMENTS.md](REQUIREMENTS.md).

```bash
git clone <your-repo-url> filmstack
cd filmstack
cp .env.example .env
```

Generate secrets and put them in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Set at least:

- `DB_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET` (≥ 32 chars)
- `JWT_REFRESH_SECRET` (different from `JWT_SECRET`)
- `CSRF_SECRET` (≥ 32 chars)
- `DATABASE_URL` and `REDIS_URL` matching those passwords

Then:

```bash
docker compose up -d
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Festival web (instance homepage) |
| http://localhost:3001 | Festival API (`/health`) |
| http://localhost:3002 | Streaming API |
| http://localhost:3003 | Streaming web |

Health check:

```bash
curl http://localhost:3001/health
```

Stop:

```bash
docker compose down
```

Volumes (`postgres_data`, `redis_data`, `uploads_data`, `festival_uploads_data`) persist across restarts.

> Never commit `.env`. It is gitignored (including `.env.*` except `.env.example`).

---

## Environment variables

See [`.env.example`](.env.example) for the full template.

### Required

| Variable | Purpose |
|----------|---------|
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Postgres credentials |
| `DATABASE_URL` | Full Postgres connection string |
| `REDIS_PASSWORD` / `REDIS_URL` | Redis |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `CSRF_SECRET` | CSRF protection |

### URLs

| Variable | Default (dev) |
|----------|----------------|
| `FESTIVAL_URL` | `http://localhost:3000` |
| `FESTIVAL_API_URL` | `http://localhost:3001` |
| `STREAMING_API_URL` | `http://localhost:3002` |
| `STREAMING_URL` | `http://localhost:3003` |
| `VITE_ROOT_DOMAIN` | Optional; apex domain shown for tenant subdomains in the UI |

### Optional integrations

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Entry fees |
| `RESEND_API_KEY` / `FROM_EMAIL` | Transactional email |
| `UPLOAD_PATH` | Local upload directory (default `./uploads`) |
| `USE_CDN` / `BUNNY_*` / `CDN_HOSTNAME` | Optional CDN |
| `SENTRY_DSN` | Error monitoring |

The stack starts without optional services; features that depend on them stay inactive until configured.

**Marketing site only:**

| Variable | Purpose |
|----------|---------|
| `VITE_APP_URL` | Absolute URL of your festival-web instance (CTA target) |

---

## Local development

Use this when you want hot reload.

### 1. Infrastructure only

```bash
docker compose up -d postgres redis
```

### 2. Install and run apps

```bash
npm install
npm run db:migrate   # when schema changes require it
npm run dev          # Turbo starts workspace apps
```

Point `.env` URLs at local ports as in `.env.example`.

### Useful root scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev servers via Turbo |
| `npm run build` | Build packages and apps |
| `npm run lint` | Typecheck / lint |
| `npm run test` | Tests (where configured) |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed demo data (dev only) |
| `npm run clean` | Clean build artifacts |
| `npm run format` | Prettier |

### Seed data (dev)

```bash
npm run db:seed
```

Demo password defaults to `Admin123!` unless you set `SEED_DEMO_PASSWORD`. **Do not seed production with default passwords.**

---

## First login

1. Open http://localhost:3000  
2. Use **Create account** on the instance homepage (registers a tenant + admin)  
3. Sign in and open the dashboard  

Authenticated users hitting `/` are redirected to `/dashboard`.

---

## Instance homepage vs marketing site

| Surface | Location | Purpose |
|---------|----------|---------|
| **Instance homepage** | `apps/festival-web` route `/` | What operators see on a self-hosted install: brand, status, Sign in / Create account, capability summary |
| **Marketing site** | `marketing/` | Public product story (platform, live rooms, pricing-style sections). Not required to run a festival |

### Run marketing locally

```bash
cd marketing
cp .env.example .env
# VITE_APP_URL=http://localhost:3000
npm install
npm run dev
```

Default marketing port: **5173**.

`marketing/` is intentionally **outside** npm workspaces so it can deploy independently.

---

## APIs at a glance

### Festival API (`:3001`)

| Prefix | Purpose |
|--------|---------|
| `/health` | Health check |
| `/api/auth` | Login, register, session |
| `/api/tenants` | Tenant management |
| `/api/festivals` | Festivals / program |
| `/api/films` | Submissions |
| `/api/judges` | Judging panels |
| `/api/payments` | Stripe payments |
| `/api/awards` | Awards |
| `/api/video-rooms` | Live rooms |
| `/api/emails` | Email templates |
| `/api/api-keys` | Tenant API keys |
| `/api/platform-admin` | Platform administration |
| `/api/bridge` | Cross-service bridge |

Auth: JWT access + refresh tokens, CSRF on mutating routes, rate limiting, Helmet, tenant middleware on tenant-scoped routes.

### Streaming API (`:3002`)

Uploads, videos, films, playlists, comments, ratings, search, subscriptions, waivers, CDN helpers, admin, analytics, recommendations, notifications, festival bridge.

Swagger (when enabled) documents the instance URL from env, not a hardcoded production host.

---

## Storage and media

- **Default:** local filesystem via `UPLOAD_PATH` (Compose mounts named volumes under `/app/uploads`)
- **No AWS S3** in the default stack; AWS credentials and SDKs were removed for self-host simplicity
- **Optional:** Bunny.net CDN when `USE_CDN=true` and Bunny env vars are set
- Transcoding uses local FFmpeg when available; otherwise processing features degrade gracefully

---

## Deployment

### Docker Compose (recommended self-host)

Covered in [Quick start](#quick-start-docker) and [INSTALL.md](INSTALL.md). Put a reverse proxy (nginx, Caddy, Traefik) in front for TLS.

### Railway

See root [`railway.toml`](railway.toml). Typical pattern:

- One Railway service per Dockerfile under `apps/`, **or** Compose if your Railway plan supports it
- Attach Postgres + Redis plugins; inject `DATABASE_URL` / `REDIS_URL`
- Set all required secrets in Railway Variables

### Vercel

| Config | Use |
|--------|-----|
| Root [`vercel.json`](vercel.json) | Optional preview of `festival-web` |
| [`marketing/vercel.json`](marketing/vercel.json) | Marketing site (primary Vercel project) |

Set `VITE_APP_URL` / `VITE_API_URL` build envs as needed. Marketing CTAs must point at a real festival-web origin.

### What not to do

- Do not commit `.env` or real secrets
- Do not expose Postgres/Redis publicly without authentication and network controls
- Do not run `db:seed` with default passwords on a public instance

---

## Nginx examples

Generic configs live in [`nginx/`](nginx/):

- `festival.example.conf` — festival-web + `/api` → `:3001`
- `streaming.example.conf` — streaming-web + `/api` → `:3002`

Copy, replace `YOUR_DOMAIN`, obtain TLS (certbot or your preferred method). Helper script: [`scripts/deploy-nginx.sh`](scripts/deploy-nginx.sh) (expects `DOMAIN_FESTIVAL` / `DOMAIN_STREAMING`).

The repo no longer ships production host configs or Let's Encrypt paths for specific domains.

---

## Scripts

| Path | Purpose |
|------|---------|
| `scripts/deploy-nginx.sh` | Install example nginx site configs from `nginx/*.example.conf` |
| `npm run *` | See [Local development](#local-development) |

---

## Documentation index

| Doc | Contents |
|-----|----------|
| [INSTALL.md](INSTALL.md) | Install paths, ports, first login |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Runtime and optional dependencies |
| [TECHNICAL.md](TECHNICAL.md) | Architecture, auth, APIs, storage |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, PRs, style |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting, hardening |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [PRODUCT.md](PRODUCT.md) | Product / brand notes for designers |
| [LICENSE](LICENSE) | Full AGPL-3.0 text |

---

## Security

- Report vulnerabilities privately per [SECURITY.md](SECURITY.md)
- Rotate any secrets that ever appeared in tickets, chats, backups, or shared screenshots
- Generate unique values for JWT / CSRF / DB / Redis secrets per environment
- Compose binds DB and Redis to `127.0.0.1` by default
- Log sanitizers redact tokens and passwords in API logging paths

---

## Contributing

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md)
2. Branch from `main` (`feat/…`, `fix/…`, `docs/…`)
3. Keep PRs focused; update docs when you change ports, env vars, or architecture
4. Run `npm run lint` and `npm run build` before opening a PR

Contributions are licensed under **AGPL-3.0**.

---

## License

This project is licensed under the **GNU Affero General Public License v3.0** ([LICENSE](LICENSE)).

In short:

- You may use, study, share, and modify the software
- If you run a **modified** version as a **network service**, you must offer the corresponding source to users of that service
- Keep copyright and license notices intact

If you need a different licensing arrangement, contact the maintainers.

---

## Roadmap notes

Actively structured for open-source self-hosting:

- [x] AGPL-3.0 license
- [x] Instance homepage (non-SaaS)
- [x] Separate `marketing/` site
- [x] Local disk storage (no AWS required)
- [x] Docker Compose full stack
- [x] Install / technical / security docs
- [x] Railway + Vercel config stubs
- [ ] Hardening production Helm/K8s examples (community welcome)
- [ ] Broader automated test coverage
- [ ] Publish tagged releases with signed artifacts

---

## Support

- Bugs and features: GitHub Issues (once the remote is published)
- Security: see [SECURITY.md](SECURITY.md)
- Design / product voice: [PRODUCT.md](PRODUCT.md)

**FestScout** — submissions to screen, on your own server.
