# 01 — High-Level Design

| | |
|---|---|
| Status | Draft v0.1 |
| Updated | 2026-10-23 |
| Related | [00-requirements.md](00-requirements.md) · [02-domain-model.md](02-domain-model.md) · [adr/](adr/) |

## 1. Summary

The system consists of a **Host App** (Electron) on the controlled machine, a **Viewer Web** (React) in the controlling user's browser, and a **Signaling API** (NestJS) in between to manage sessions, authentication, and the exchange of connection information.

Video and input **do not pass through the server** when WebRTC succeeds: they travel peer-to-peer (or via TURN) and are end-to-end encrypted with DTLS-SRTP. The server only relays video when using **Fallback Relay**.

## 2. C4 Level 1 — System Context

```mermaid
flowchart LR
    host([Host user]):::person
    viewer([Viewer user]):::person
    sys[Remote Desktop System]:::system
    stun[(Public STUN)]:::ext

    host -- "Create session, approve Viewer,<br/>share screen" --> sys
    viewer -- "Enter code + OTP,<br/>view and control" --> sys
    sys -- "Discover public addresses<br/>(ICE)" --> stun

    classDef person fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef system fill:#1d4ed8,stroke:#1e3a8a,color:#fff
    classDef ext fill:#e5e7eb,stroke:#6b7280,color:#111
```

## 3. C4 Level 2 — Containers

```mermaid
flowchart TB
    subgraph hostpc[Host Machine - Windows]
        hostapp["Host App<br/><i>Electron + TypeScript</i><br/>Screen capture, input execution,<br/>Viewer approval UI"]
    end

    subgraph browser[Viewer Browser]
        viewerweb["Viewer Web<br/><i>React + Vite + TypeScript</i><br/>Enter code, display screen,<br/>send input"]
    end

    subgraph cloud[Server / VPS]
        api["Signaling API<br/><i>NestJS</i><br/>REST: create/join session<br/>WS Gateway: approval, signaling, relay"]
        redis[("Redis<br/>Session state (TTL)<br/>Socket.IO adapter<br/>Rate limit")]
        pg[("PostgreSQL<br/>Audit log")]
        turn["coturn<br/>TURN/STUN"]
    end

    hostapp -- "HTTPS + WSS<br/>(session, signaling, relay)" --> api
    viewerweb -- "HTTPS + WSS" --> api
    api --> redis
    api --> pg
    hostapp <-. "WebRTC: media + DataChannel<br/>(DTLS-SRTP, P2P)" .-> viewerweb
    hostapp <-. "when P2P fails" .-> turn
    viewerweb <-. "when P2P fails" .-> turn
```

| Container | Technology | Responsibilities | Does not do |
|---|---|---|---|
| Host App | Electron, `desktopCapturer`, `@jitsi/robotjs` | Create session, display Join Request, capture & stream screen, execute authenticated input | Does not determine permissions autonomously; permissions granted by server |
| Viewer Web | React, Vite | Enter code + OTP, display video/images, capture input, display metrics | Does not persist long-term secrets (short-lived in-memory JWT only) |
| Signaling API | NestJS, Socket.IO | Session lifecycle, authentication, issue JWT, relay signaling, Fallback Relay, rate limit, publish domain events | Does not store screen content |
| Redis | Redis 7 | Session state with TTL, code → session mapping, Socket.IO adapter, rate limit counters | Not an audit source |
| PostgreSQL | PostgreSQL 16 | Immutable audit log | Does not maintain active session state |
| coturn | coturn | TURN relay when P2P is blocked, ephemeral credentials | — |

## 4. Key flows

### 4.1 Session creation and Viewer approval (FR-01…FR-05)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant R as Redis
    participant V as Viewer Web

    H->>A: POST /sessions
    A->>R: save Session(Created→WaitingForViewer), code→id, OTP hash, TTL 10'
    A-->>H: { sessionId, code (9 digits), otp (6 digits), hostToken }
    H->>A: WS connect (auth: hostToken)
    Note over H: Host reads code + OTP to Viewer

    V->>A: POST /sessions/join { code, otp }
    A->>A: rate limit by IP
    A->>R: check status + OTP, mark OTP consumed, transition → PendingApproval
    A-->>V: { joinRequestId } (202)
    A-->>H: WS "join.requested" { joinRequestId, ip }
    H->>A: WS "join.approve" { joinRequestId, role }
    A->>R: transition → Active, set 2-hour deadline
    A-->>V: WS/poll "join.approved" { viewerToken (JWT, short TTL), role, iceServers }
    V->>A: WS connect (auth: viewerToken)
```

### 4.2 WebRTC setup (FR-10, FR-20, FR-21)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant V as Viewer Web

    H->>H: desktopCapturer → MediaStream
    H->>A: "rtc.offer" { sdp }
    A->>A: verify both belong to same Active session
    A-->>V: "rtc.offer" { sdp }
    V->>A: "rtc.answer" { sdp }
    A-->>H: "rtc.answer" { sdp }
    H-)A: "rtc.ice" (multiple times)
    A--)V: "rtc.ice"
    V-)A: "rtc.ice" (multiple times)
    A--)H: "rtc.ice"
    Note over H,V: ICE success → media track + DataChannel "input"
    V-)H: input via DataChannel (pointer unordered, key/click ordered)
```

### 4.3 Fallback Relay (FR-11)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant V as Viewer Web

    Note over H,V: ICE fails or exceeds 10 seconds
    V->>A: "media.fallback" { reason }
    A-->>H: "media.fallback"
    loop each frame
        H->>A: "relay.frame" (binary JPEG) + ack
        A-->>V: "relay.frame" (binary)
        V-->>A: ack
        A-->>H: ack → Host captures next frame (backpressure)
    end
    V->>A: "relay.input" { ... }
    A->>A: verify role = controller
    A-->>H: "relay.input"
```

### 4.4 Termination and expiration (FR-07, FR-08)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant R as Redis
    participant V as Viewer Web

    alt Host or Viewer terminates
        H->>A: "session.terminate"
        A->>R: transition → Terminated, delete keys
        A-->>V: "session.terminated"
    else Expired (TTL)
        R-->>A: keyspace notification / scan job
        A-->>H: "session.expired"
    end
    A->>A: publish domain event → Audit writes to PostgreSQL
```

## 5. Deployment

**Local (development):** `docker-compose` including `api`, `redis`, `postgres`, `coturn`; Viewer runs `vite dev`; Host App runs `electron .`.

**Demo:** a single VPS running docker-compose behind Caddy/Nginx (automated TLS) with a custom domain; coturn opens UDP/TCP port 3478 and relay port ranges; Host App packaged via `electron-builder` (Windows) and released via GitHub Releases.

```mermaid
flowchart LR
    subgraph vps[VPS]
        proxy[Caddy - TLS] --> api1[api]
        proxy --> api2[api - instance 2]
        api1 --> redis[(redis)]
        api2 --> redis
        api1 --> pg[(postgres)]
        turn[coturn :3478 UDP/TCP]
    end
    viewer[Viewer - browser] -- WSS/HTTPS --> proxy
    host[Host App] -- WSS/HTTPS --> proxy
```

## 6. Quality attributes → design decisions

| NFR | Decision | ADR |
|---|---|---|
| NFR-01, NFR-02 Latency, fps | WebRTC (UDP, video codec, congestion control) for media; DataChannel for input; pointer unordered | ADR-002 |
| NFR-03 Relay bandwidth | Binary JPEG, downscaled resolution, ack-based backpressure | ADR-003 |
| NFR-04 Encryption | WSS/HTTPS via reverse proxy; WebRTC default DTLS-SRTP | ADR-002 |
| NFR-05 Brute-force protection | 9-digit code + OTP + host approval + rate limiting in Redis | ADR-004 |
| NFR-06 Robustness | Validate all payloads with shared schema; size limits | ADR-007 |
| NFR-07 Scalability | Session state in Redis, Socket.IO Redis adapter; stateless server | ADR-005 |
| NFR-08 Host security | `contextIsolation`, preload + `contextBridge`, IPC whitelist | (host-app LLD) |
| NFR-09 Quality | Clean architecture, DDD in Session & Access, TDD | ADR-006 |

## 7. Architectural risks

| Risk | Impact | Mitigation |
|---|---|---|
| Invariant "1 Viewer/session" violated when 2 instances process concurrently | Two users controlling simultaneously | Atomic state transition in Redis (Lua script or `WATCH/MULTI`) |
| ICE failure on corporate networks | Screen cannot be viewed | TURN over TCP/443; Fallback Relay |
| Native module (`robotjs`) fails to build on newer Electron | Cannot control | `@jitsi/robotjs` + `electron-rebuild`; `nut.js` fallback |
| Relay consumes server bandwidth | Cost, congestion | Limit fps/resolution on relay; use only when necessary |

## 8. Next steps

- `02-domain-model.md`: details of `RemoteSession` aggregate, invariants, state machine, domain events.
- `04-protocol.md`: WS/DataChannel and REST event table following flows in section 4.
- `05-security.md`: STRIDE for each container in section 3.
