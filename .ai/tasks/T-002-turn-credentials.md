# T-002 — ICE server list and temporary TURN credentials

| | |
|---|---|
| Status | done |
| Assignee | Gemini |
| Branch | `gemini/T-002` (created from `master`) |
| Related | `docs/04-protocol.md` §4.4 (`join.approved.iceServers`) · `docs/05-security.md` D5 · ADR-002 · `docs/03-lld/session-access.md` §2, §9 |

## Goal
When the Host approves a Viewer, the server includes a list of ICE servers so both sides can establish WebRTC. TURN uses **temporary credentials** following coturn's "TURN REST API" standard (`use-auth-secret`), expiring with the session, so no one can use the system's TURN as a free proxy.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `docs/04-protocol.md` §4.4 — `iceServers: RTCIceServer[]`
- `packages/protocol/src/ws/server-events.ts` — schema `IceServer` (to understand the data shape; do **not** import this package)

## Scope (only these files may be created or changed)
- `apps/server/src/session-access/application/ports/ice-server-provider.ts` — create exactly as shown in Contract
- `apps/server/src/session-access/application/ports/index.ts` — add a one-line export
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts` (+ `.test.ts`)

## Allowed new dependencies
- None. Use `node:crypto` (`createHmac`).

## Contract

Port (create verbatim):
```ts
// apps/server/src/session-access/application/ports/ice-server-provider.ts
export interface IceServer {
  readonly urls: string | readonly string[];
  readonly username?: string;
  readonly credential?: string;
}

/** ICE servers handed to an approved viewer and to the host (ADR-002). */
export interface IceServerProvider {
  forSession(sessionId: string, expiresAt: Date): IceServer[];
}
```

Adapter:
```ts
export interface TurnConfig {
  readonly stunUrls: readonly string[];   // e.g. ['stun:stun.l.google.com:19302']
  readonly turnUrls: readonly string[];   // e.g. ['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:443?transport=tcp']
  readonly turnSecret: string;            // = static-auth-secret of coturn
}
export class TurnIceServerProvider implements IceServerProvider { constructor(config: TurnConfig) }
```

Behavior of `forSession(sessionId, expiresAt)`:
1. If `stunUrls` is not empty → one element `{ urls: stunUrls }` (without username/credential).
2. If `turnUrls` is not empty → one element `{ urls: turnUrls, username, credential }` with:
   - `username = "<expiresAt in Unix seconds, rounded down>:<sessionId>"`
   - `credential = base64( HMAC-SHA1( turnSecret, username ) )`
3. Order: STUN first, TURN second. Omit the corresponding element if the list is empty.

The constructor throws `Error` if `turnUrls` is not empty but `turnSecret` is empty, or if any URL does not start with `stun:`, `turn:` or `turns:` (appropriate type for each list: `stunUrls` only `stun:`; `turnUrls` only `turn:`/`turns:`).

## Acceptance criteria
- [x] **Test vector** (must match exactly): `turnSecret = "s3cret-turn-key"`, `sessionId = "5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b"`, `expiresAt = 2026-10-24T12:00:00.000Z` → `username = "1792843200:5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b"`, `credential = "8jApRNGz7QzNfABPvnYe/VCOgqU="`.
- [x] `expiresAt = 2026-10-24T12:00:00.900Z` produces the same `username` as above (rounded down).
- [x] STUN only → exactly one element, without `username`/`credential`.
- [x] TURN only → exactly one element with `username` and `credential`.
- [x] Both empty → `[]`.
- [x] Constructor throws error for: TURN has URLs but secret is empty; `stunUrls` contains a `turn:` URL; `turnUrls` contains an `http:` URL.
- [x] Does not log and does not include `turnSecret` in any return value (test: `JSON.stringify(result)` does not contain the secret).
- [x] `pnpm run check` passes.

## Required tests
`turn-ice-server.provider.test.ts` according to `docs/06-test-strategy.md` §5; use `afterEach(() => { vi.restoreAllMocks(); })` if mocking.

## Out of scope
- Reading environment variables `TURN_URLS`/`TURN_SECRET` (done in NestJS PR).
- Calling the provider from `ApproveJoin` or gateway; configuring coturn; docker-compose.
- Modifying use cases, domain, protocol, or documentation.

## Gemini report

### What was done
1. Created port `IceServerProvider` and interface `IceServer` at `apps/server/src/session-access/application/ports/ice-server-provider.ts` according to the contract.
2. Re-exported `ice-server-provider.js` in `apps/server/src/session-access/application/ports/index.ts`.
3. Wrote unit tests following TDD in `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.test.ts` covering 11 test cases:
   - Exact match with test vector (username format `<unixSeconds>:<sessionId>` and credential HMAC-SHA1 base64).
   - Rounding down Unix seconds when `expiresAt` has fractional milliseconds.
   - Returning STUN only, TURN only, both (correct order: STUN first, TURN second), or empty array `[]` when both are empty.
   - Validating URLs and secret in constructor (throws `Error` on invalid URL scheme or missing secret).
   - Ensuring `turnSecret` is not leaked into the return value or JSON string.
   - Using `afterEach(() => { vi.restoreAllMocks(); })`.
4. Implemented adapter `TurnIceServerProvider` at `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts`.
5. Formatted code with prettier and verified the entire suite `pnpm run check` is 100% green.

### Files created / changed
- `apps/server/src/session-access/application/ports/ice-server-provider.ts`
- `apps/server/src/session-access/application/ports/index.ts`
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts`
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.test.ts`
- `.ai/tasks/T-002-turn-credentials.md`

### Commands run
- `pnpm --filter @pbl4/server test turn-ice-server.provider.test.ts`
- `pnpm format`
- `pnpm run check`

### Unsure
- None. All acceptance criteria met and verified by tests.
