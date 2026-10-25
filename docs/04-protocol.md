# 04 — Protocol (REST · WebSocket · DataChannel)

| | |
|---|---|
| Status | Draft v0.1 |
| Updated | 2026-10-23 |
| Protocol version | `1` |
| Related | [01-hld.md §4](01-hld.md) · [02-domain-model.md](02-domain-model.md) · [03-lld/session-access.md](03-lld/session-access.md) |

**Source of truth:** package `packages/protocol` (zod schema). This document describes that schema; if they diverge, code wins and the documentation must be updated in the same PR.

## 1. General conventions

| Item | Convention |
|---|---|
| Base URL | `https://<host>/v1` · WebSocket: `wss://<host>/session` (Socket.IO namespace `/session`) |
| Format | JSON UTF-8; timestamps in ISO-8601 UTC; IDs as UUID v4 |
| WS event names | `<target>.<action>` lowercase, e.g. `join.approve` |
| Acknowledged commands | Client includes an ack callback; server always returns `{ ok: true, data? }` or `{ ok: false, error }` |
| Errors | `{ code: string, message: string }` — `code` is stable (§7), `message` is for debugging only |
| Payload limit | 1 MB (`maxHttpBufferSize`); exceeded → disconnects with `PAYLOAD_TOO_LARGE` |
| Version | WS handshake sends `auth.protocolVersion = "1"`; different version → `connect_error` with `PROTOCOL_VERSION_UNSUPPORTED` |

## 2. Tokens

| Token | Issued when | Claims | Used for | Expiration |
|---|---|---|---|---|
| `hostToken` | `POST /sessions` | `sub=sessionId`, `kind=host` | WS connection with Host role | Until maximum session lifetime ends (WAITING_TTL + 2h) |
| `pendingToken` | `POST /sessions/join` succeeds | `sub=sessionId`, `kind=pending`, `jrid=joinRequestId` | WS connection to wait for Host decision | 60 seconds (= APPROVAL_TIMEOUT) |
| `viewerToken` | Host approval (pushed via WS) | `sub=sessionId`, `kind=viewer`, `vid=viewerId` | WS connection with Viewer role | Until `activeExpiresAt` |

- JWT signed with HS256 using an environment variable secret; client holds tokens **in memory**, not in localStorage.
- Tokens do not contain the Controller/Observer role. Every command is re-validated against the session state in Redis, so when the Host changes a role or terminates a session, the effect is **immediate** without revoking the token.

## 3. REST API

### 3.1 `POST /v1/sessions` — Host creates session (FR-01)

Request: empty body.

`201 Created`
```json
{
  "sessionId": "5b0c…",
  "code": "482915307",
  "otp": "093184",
  "otpExpiresAt": "2026-10-24T03:10:00Z",
  "waitingExpiresAt": "2026-10-24T03:10:00Z",
  "hostToken": "eyJ…"
}
```
Errors: `429 RATE_LIMITED`, `503 CODE_SPACE_EXHAUSTED` (could not generate unique code after N attempts).

### 3.2 `POST /v1/sessions/join` — Viewer requests to join (FR-03)

```json
{ "code": "482915307", "otp": "093184" }
```

`202 Accepted`
```json
{
  "joinRequestId": "c1d2…",
  "pendingToken": "eyJ…",
  "decisionDeadline": "2026-10-24T03:01:00Z"
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `INVALID_INPUT` | Invalid format (not 9 digits / 6 digits) |
| 401 | `INVALID_CREDENTIALS` | Code does not exist, incorrect OTP, OTP consumed/expired, session locked, session occupied |
| 429 | `RATE_LIMITED` | Exceeded 5 requests/IP/min; includes `Retry-After` header |

> Every authentication failure returns the **exact same** `401 INVALID_CREDENTIALS`, preventing an attacker from distinguishing "code does not exist" from "incorrect OTP" or "session locked". The Host still receives detailed information over WS (`session.locked`).

### 3.3 `GET /v1/health`
`200 { "status": "ok", "redis": "ok" }` — used for load balancers and docker health checks.

## 4. WebSocket — namespace `/session`

### 4.1 Connection

```ts
io("wss://<host>/session", {
  auth: { token: "<hostToken | pendingToken | viewerToken>", protocolVersion: "1" },
  transports: ["websocket"],
});
```

Server authenticates during handshake middleware, attaches `principal = { kind, sessionId, viewerId?, joinRequestId? }` to the socket, and joins rooms:

| kind | Room |
|---|---|
| host | `s:{sessionId}:host` |
| pending | `jr:{joinRequestId}` |
| viewer | `s:{sessionId}:viewer` |

Errors in `connect_error.data.code`: `UNAUTHORIZED`, `PROTOCOL_VERSION_UNSUPPORTED`, `SESSION_CLOSED`.
Each session maintains **only one Host socket and one Viewer socket**; a new socket with the same role replaces the existing socket (the old socket receives `session.replaced` and is disconnected).

### 4.2 Host commands (client → server, with ack)

| Event | Payload | `data` on success | Errors | FR |
|---|---|---|---|---|
| `session.otp.regenerate` | `{}` | `{ otp, otpExpiresAt }` | `JOIN_ALREADY_PENDING`, `SESSION_OCCUPIED`, `SESSION_CLOSED` | FR-02, FR-03a |
| `join.approve` | `{ joinRequestId, role: "controller" \| "observer" }` | `{ viewerId, activeExpiresAt }` | `NO_PENDING_JOIN`, `JOIN_REQUEST_EXPIRED`, `SESSION_CLOSED` | FR-04, FR-05 |
| `join.reject` | `{ joinRequestId }` | `{}` | `NO_PENDING_JOIN`, `SESSION_CLOSED` | FR-04 |
| `viewer.role.change` | `{ role }` | `{ role }` | `NO_VIEWER`, `SESSION_CLOSED` | FR-06, FR-24 |
| `session.terminate` | `{ reason?: string }` | `{}` | `SESSION_CLOSED` | FR-07 |

### 4.3 Viewer commands (client → server, with ack)

| Event | Payload | Errors | FR |
|---|---|---|---|
| `session.terminate` | `{ reason?: string }` | `SESSION_CLOSED` | FR-07 |

The `pending` socket sends no commands, only listens for events in §4.4.

### 4.4 Server → client events

| Event | Sent to | Payload |
|---|---|---|
| `join.requested` | host | `{ joinRequestId, viewerIp, decisionDeadline }` |
| `join.approved` | pending | `{ viewerToken, viewerId, role, activeExpiresAt, iceServers: RTCIceServer[] }` |
| `join.rejected` | pending | `{ reason: "rejected" \| "timeout" }` |
| `session.locked` | host | `{ failedAttempts }` |
| `viewer.connected` / `viewer.disconnected` | host | `{ viewerId }` |
| `viewer.role.changed` | viewer | `{ role }` |
| `session.expiring` | host, viewer | `{ expiresAt }` (5 minutes before deadline) |
| `session.terminated` | host, viewer | `{ by: "host" \| "viewer", reason? }` |
| `session.expired` | host, viewer, pending | `{}` |
| `session.replaced` | old socket | `{}` |

`iceServers` includes public STUN and system TURN with ephemeral credentials (HMAC following coturn REST API standard, expiring at `activeExpiresAt`).

### 4.5 WebRTC signaling (only when session is Active)

| Event | Direction | Payload |
|---|---|---|
| `rtc.offer` | host → server → viewer | `{ sdp: string }` |
| `rtc.answer` | viewer → server → host | `{ sdp: string }` |
| `rtc.ice` | bidirectional | `{ candidate: RTCIceCandidateInit \| null }` (`null` = end-of-candidates) |
| `media.fallback` | viewer → server → host | `{ reason: "ice_failed" \| "timeout" \| "manual" }` |
| `media.mode` | host → server → viewer | `{ mode: "webrtc" \| "relay" }` |

Server only forwards, does not inspect SDP; limits `sdp` ≤ 64 KB. Sent when session is not `Active` → ack `SESSION_NOT_ACTIVE`.

### 4.6 Fallback Relay

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `relay.frame` | host → server → viewer | `(meta: { seq, width, height, ts }, jpeg: Buffer)` | Socket.IO binary attachment |
| `relay.frame.ack` | viewer → server → host | `{ seq }` | Host only sends a new frame after receiving ack for the previous frame, or after a 1-second timeout (skipping that frame) |
| `relay.input` | viewer → server → host | `InputEvent` (§5) | Server rejects if Viewer is Observer → `FORBIDDEN` |

## 5. Input events (shared between DataChannel and relay.input)

```ts
type Button = "left" | "middle" | "right";
type Modifiers = { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };

type InputEvent =
  | { t: "pm"; x: number; y: number }                          // pointer move, x,y ∈ [0,1]
  | { t: "pd"; b: Button; x: number; y: number }               // pointer down
  | { t: "pu"; b: Button; x: number; y: number }               // pointer up
  | { t: "dc"; b: Button; x: number; y: number }               // double click
  | { t: "wh"; dx: number; dy: number }                        // wheel (pixel delta, clamped to ±1200)
  | { t: "kd"; key: string; code: string; mods: Modifiers }    // key down
  | { t: "ku"; key: string; code: string; mods: Modifiers };   // key up
```

- Coordinates are always **normalized 0..1** relative to the currently displayed frame; the Host converts to real resolution and DPI (FR-22).
- Sends both `key` (logical character) and `code` (physical key); Host prioritizes `code` for control keys and `key` for characters; mapping table is in the input-control LLD.
- Field names are short because `pm` may be sent ~60 times/second.

### 5.1 RTCDataChannel

| Channel | Configuration | Carries events |
|---|---|---|
| `input` | `ordered: true`, reliable | `pd`, `pu`, `dc`, `wh`, `kd`, `ku` |
| `input-pointer` | `ordered: false`, `maxRetransmits: 0` | `pm` (dropped packets discarded, only the latest position is meaningful) |

Host ignores all events on DataChannel when the current role is Observer (Host receives the new role via `viewer.role.changed` sent concurrently to both Host and Viewer) — the server is not an intermediary for DataChannel, so the Host is where blocking occurs.

## 6. Example zod schemas (in packages/protocol)

```ts
export const PROTOCOL_VERSION = "1" as const;

export const JoinRequestBody = z.object({
  code: z.string().regex(/^[1-9][0-9]{8}$/),
  otp: z.string().regex(/^[0-9]{6}$/),
});

export const JoinApprovePayload = z.object({
  joinRequestId: z.string().uuid(),
  role: z.enum(["controller", "observer"]),
});

const unit = z.number().min(0).max(1);
export const InputEvent = z.discriminatedUnion("t", [
  z.object({ t: z.literal("pm"), x: unit, y: unit }),
  // … remaining variants as in §5
]);

export type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
```

## 7. Error codes

| `code` | HTTP | Meaning | Domain error source |
|---|---|---|---|
| `INVALID_INPUT` | 400 | Payload violates schema | (validation) |
| `INVALID_CREDENTIALS` | 401 | Join failed (all reasons) | `OtpMismatch`, `OtpExpired`, `OtpConsumed`, `SessionLocked`, `SessionOccupied`, `JoinAlreadyPending`, code not found |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token | (auth) |
| `FORBIDDEN` | 403 | Correct session but wrong role (Viewer calling Host command, Observer sending input) | (guard) |
| `RATE_LIMITED` | 429 | Exceeded rate limit | (throttler) |
| `NO_PENDING_JOIN` | 409 | No matching Join Request | `NoPendingJoin` |
| `JOIN_REQUEST_EXPIRED` | 409 | Exceeded 60 seconds | `JoinRequestExpired` |
| `JOIN_ALREADY_PENDING` | 409 | (Host side) Join Request already pending | `JoinAlreadyPending` |
| `SESSION_OCCUPIED` | 409 | (Host side) session already has a Viewer | `SessionOccupied` |
| `NO_VIEWER` | 409 | No active Viewer | `NoViewer` |
| `SESSION_NOT_ACTIVE` | 409 | Signaling/relay when session is not `Active` | (query) |
| `SESSION_CLOSED` | 410 | Session has terminated/expired | `SessionClosed` |
| `CONFLICT` | 409 | Concurrency conflict after retry | `ConcurrencyConflict` |
| `PAYLOAD_TOO_LARGE` | 413 | Exceeded payload size limit | (transport) |
| `PROTOCOL_VERSION_UNSUPPORTED` | — | Invalid `protocolVersion` | (handshake) |
| `CODE_SPACE_EXHAUSTED` | 503 | Failed to generate unique code | (application) |
| `INTERNAL` | 500 | Unexpected error (logged with `requestId`) | — |

## 8. How the contract is tested

- **Contract tests** in `packages/protocol`: every schema has valid and invalid fixtures.
- Server validates all incoming payloads with schemas (pipe/guard); client validates all received payloads in dev mode.
- Gateway E2E tests use types directly from `packages/protocol`, so schema changes that miss one side will fail typecheck.
