# ADR-004 — Session code + OTP + host approval + short-lived JWT

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | FR-01…FR-09b, NFR-05, 02-domain-model D1/D2, 05-security S1–S4 |

## Context
The 2021 version used a UUID as the room: anyone who knew the UUID could view and control, the UUID never changed between sessions, and the Host was not consulted. The system has no user accounts (out of scope for v1).

## Decision
- Host receives a **9-digit Session Code** and a **6-digit OTP** (single-use, expires in 10 minutes, stored as argon2id hash).
- Viewer sends code + OTP; if correct, the OTP is consumed immediately and **the Host must approve** within 60 seconds.
- Lock the session after 5 wrong OTP attempts; rate limit by IP.
- Identity upon WS connection is a **short-lived JWT** by role (`host`, `pending`, `viewer`); actual permissions (Controller/Observer, session still alive) are checked against Redis on every command.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Link containing UUID (like 2021) | Simple | Leaking link yields full control; no approval step | Bug L11 |
| Accounts + login | Clear identity, supports unattended | Adds an entire identity system | Out of scope for v1 (Q2) |
| Alphanumeric OTP | Larger space | Hard to dictate over the phone | Selected digits-only (Q1); compensated by session locking + host approval |
| Server-side session cookie instead of JWT | Easy revocation | Needs lookup every request; cookies with cross-origin WS are more complex | JWT + checking session state already allows instant revocation |

## Consequences
- Positive: multi-layered security without requiring accounts; familiar to users (like TeamViewer/AnyDesk); permission revocation takes effect immediately.
- Negative: every WS command needs to read Redis (acceptable, Redis is fast); Host must be present.
- Follow-up actions: guard against timing attack when code does not exist; same 401 error for all join failures; security e2e tests (05 §5).
