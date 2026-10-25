# ADR-005 — Redis for session state, PostgreSQL for audit only

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | NFR-07, FR-30, 02-domain-model §5–6, 03-lld/session-access §7–8 |

## Context
Sessions are short-lived (≤ 2h10m), require TTL, read on every WS command, and must remain consistent across multiple server instances. Multi-instance Socket.IO needs a shared channel to emit to rooms. Audit needs durable storage and queryability.

## Decision
- **Redis** stores the `RemoteSession` aggregate (JSON + `version`), code-to-session mapping, deadline queues (sorted set), rate limit counters, and serves as the **Socket.IO Redis adapter**. Writes execute via Lua script with version check (optimistic concurrency).
- **PostgreSQL** stores only the append-only audit log, written by the domain event subscriber.
- Events are published in-process (`EventEmitter2`) **after** successful Redis save.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| PostgreSQL for both session state (row lock) and audit | Single data source, transactions | No natural TTL; high read/write load for short-lived data; still needs Redis for adapter | Adds unnecessary complexity |
| In-process memory + sticky session | Fast, simple | State lost on restart; cannot run multiple instances safely | Violates NFR-07 |
| Redis lock (Redlock) instead of optimistic concurrency | Familiar | Locks have deadlines, prone to errors on GC pauses; actual conflicts are very rare | Optimistic is simple and sufficient |
| Outbox pattern for events | No lost events | Needs outbox table + worker | Deferred: accept risk of losing audit events in v1 |

## Consequences
- Positive: built-in TTL and atomicity; horizontal scaling requires only adding instances; clearly separates hot data (Redis) and history (Postgres).
- Negative: Redis is a single point of failure (losing Redis = losing all running sessions, accepted for v1); two datastores to operate.
- Follow-up actions: integration tests for Lua script and scheduler lock contention via `ZREM`; record outbox in "What I'd do next".
