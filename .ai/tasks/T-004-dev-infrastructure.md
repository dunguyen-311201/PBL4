# T-004 — Dev infrastructure with Docker Compose: Redis, PostgreSQL, coturn

| | |
|---|---|
| Status | on-hold |
| Assignee | Gemini |
| Branch | `gemini/T-004` (created from `master`) |
| Related | `docs/01-hld.md` §3, §5 (deployment) · `docs/05-security.md` D5, §6 · `docs/03-lld/session-access.md` §9 · ADR-002, ADR-005 |

## Goal
A single command to spin up sufficient infrastructure for the dev environment: Redis (session state), PostgreSQL (audit), coturn (TURN for WebRTC). Not running the NestJS server in compose yet (separate PR).

**Prerequisite:** Docker Desktop required on the machine. If `docker version` errors → **stop, record in Report**, do not proceed further.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `docs/01-hld.md` §5, `docs/05-security.md` D5 and §6 (deployment checklist)
- `docs/03-lld/session-access.md` §9 (environment variables)

## Scope (only these files may be created or changed)
- `docker-compose.yml` (repo root)
- `docker/coturn/turnserver.conf`
- `.env.example` (repo root)
- `docs/dev-setup.md` (new)

## Allowed new dependencies
- None (do not change `package.json`).

## Contract

**`docker-compose.yml`** — 3 services, all with `restart: unless-stopped`:

| Service | Image | Host port | Notes |
|---|---|---|---|
| `redis` | `redis:7-alpine` | `6379:6379` | `healthcheck`: `redis-cli ping` |
| `postgres` | `postgres:16-alpine` | `5432:5432` | user/pass/db taken from `.env`; named volume `pgdata`; `healthcheck`: `pg_isready` |
| `coturn` | `coturn/coturn:4.6` | `3478:3478/udp`, `3478:3478/tcp`, `49160-49200:49160-49200/udp` | mount `docker/coturn/turnserver.conf` read-only; secret passed via environment variable, **not** hardcoded in conf file |

**`docker/coturn/turnserver.conf`** must have: `listening-port=3478`, `min-port=49160`, `max-port=49200`, `use-auth-secret`, `realm=pbl4.local`, `fingerprint`, `no-cli`, `no-multicast-peers`, and `denied-peer-ip` for **all** of the following ranges (blocking the use of TURN to access the internal network — 05-security D5):
`0.0.0.0-0.255.255.255`, `10.0.0.0-10.255.255.255`, `100.64.0.0-100.127.255.255`, `127.0.0.0-127.255.255.255`, `169.254.0.0-169.254.255.255`, `172.16.0.0-172.31.255.255`, `192.168.0.0-192.168.255.255`, `::1`, `fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff`, `fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff`.
`static-auth-secret` passed as a command-line parameter from environment variable `TURN_SECRET` (e.g. `command: ["-c", "/etc/coturn/turnserver.conf", "--static-auth-secret=${TURN_SECRET}"]`).

**`.env.example`** — sample values only, **no** real secrets:
`REDIS_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `JWT_SECRET` (note: ≥ 32 random bytes, generated with `openssl rand -base64 48`), `TURN_SECRET`, `TURN_URLS`, `STUN_URLS`. One short comment line per variable.

**`docs/dev-setup.md`** — concise, in English: requirements (Node 22, pnpm, Docker Desktop), steps `cp .env.example .env` → `docker compose up -d` → verify healthy → run `pnpm test:integration` with `REDIS_URL` from compose; how to stop/clean up data; coturn UDP port note on Windows.

## Acceptance criteria
- [ ] `docker compose config` runs without errors.
- [ ] `docker compose up -d redis postgres` → both `healthy` (paste `docker compose ps` output into Report).
- [ ] `docker compose up -d coturn` runs without exiting; `docker compose logs coturn` has no configuration errors (paste the first few lines into Report).
- [ ] With `REDIS_URL=redis://localhost:6379`, `pnpm test:integration` passes.
- [ ] `turnserver.conf` contains all `denied-peer-ip` lines above; no secrets in any committed files.
- [ ] `.env` is **not** committed (already in `.gitignore`); `.env.example` is committed.
- [ ] `pnpm run check` passes.

## Out of scope
- NestJS service, Caddy/TLS, VPS deployment.
- Modifying code, `package.json`, CI.

## Gemini report
_(Filled in by Gemini when done.)_
