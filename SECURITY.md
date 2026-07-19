# Security

## Reporting a vulnerability

Email the maintainers (or use your private GitHub Security Advisory if the repo is on GitHub) with:

- A description of the issue
- Steps to reproduce
- Impact assessment (auth bypass, data exposure, RCE, etc.)
- Any suggested fix

Please **do not** open a public issue for security bugs until a fix is released or maintainers confirm disclosure.

## Scope

In scope: festival-api, festival-web, streaming-api, streaming-web, shared packages, docker-compose defaults.

Out of scope: third-party services you configure yourself (Stripe, Resend, Bunny), and misconfiguration of your own deployment secrets.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x (main) | Yes |

## Hardening tips for operators

- Set strong unique values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`
- Never commit `.env`. It is gitignored (including `.env.*` except `.env.example`)
- If a `.env` with real secrets was ever copied into a ticket, chat, or backup, **rotate those secrets**
- Keep Compose DB/Redis bound to localhost unless you need remote access
- Terminate TLS at a reverse proxy in production
- Do not run `prisma db seed` against production with default demo passwords
- Keep dependencies updated (`npm audit`)
- Set CORS / `FRONTEND_URL` / `STREAMING_URL` to your real origins only (no leftover third-party domains)
