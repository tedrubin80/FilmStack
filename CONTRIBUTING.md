# Contributing

Thanks for helping improve FestScout / FilmStack.

## Ground rules

- Be respectful; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Keep changes focused. Prefer small PRs over large unrelated diffs.
- Do not commit secrets (`.env`, API keys, credentials).
- The project is **AGPL-3.0**. Contributions are licensed under the same terms.

## Setup

Follow [INSTALL.md](INSTALL.md) and [REQUIREMENTS.md](REQUIREMENTS.md).

```bash
cp .env.example .env
# fill required secrets
docker compose up -d postgres redis   # or full stack
npm install
npm run dev
```

## Branching and PRs

1. Create a branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Make your change; keep the diff reviewable.
3. Run checks:

```bash
npm run lint
npm run build
```

4. Open a PR with a short summary of **why** and how to test.

## Code style

- Match existing patterns in the app you touch (festival-api is TypeScript; streaming-api is JS).
- Prefer clear names and small functions over clever abstractions.
- No drive-by refactors in unrelated files.

## Docs

If you change ports, env vars, or architecture, update `INSTALL.md`, `REQUIREMENTS.md`, and/or `TECHNICAL.md` in the same PR.

## Security

Report vulnerabilities privately per [SECURITY.md](SECURITY.md). Do not open public issues for exploitable bugs before a fix is ready.
