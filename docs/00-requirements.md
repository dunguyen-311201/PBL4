# 00 — Requirements

| | |
|---|---|
| Status | Draft v0.2 (Q1–Q3 resolved) |
| Updated | 2026-10-23 |
| Author | Nguyen Huu Du (`dunguyen-311201`) |
| Related | [01-hld.md](01-hld.md) · [ADR-001](adr/ADR-001-rewrite-instead-of-patch.md) |

## 1. Context

The 2021 version (tag `v0-legacy-2021`) was a course project: an Electron app on the controlled machine captured the screen every 500ms, sending base64 PNG images through a Socket.IO relay; an HTML page on the controller side displayed the images and sent back mouse/keyboard events, executed using `robotjs`.

This version worked on a single machine/LAN but had functional bugs, poor performance, and no security layer. The redesign rebuilds the system toward a minimal, correct, and secure remote desktop product.

## 2. Terminology

| Term | Meaning |
|---|---|
| **Host** | The person/machine sharing the screen and being controlled. Runs the Host App (Electron). |
| **Viewer** | The remote viewer/controller. Uses Viewer Web (browser). |
| **Session** | A connection session between exactly 1 Host and at most 1 Viewer. |
| **Session Code** | A 9-digit code identifying the session, read by the Host to the Viewer. |
| **One-time Password (OTP)** | A short password accompanying the Session Code, single-use, with an expiration time. |
| **Join Request** | A join request from the Viewer, awaiting host approval. |
| **Controller / Observer** | A Viewer with control permission / view-only permission. |
| **Media Channel** | The channel transmitting screen video/images (WebRTC, or relay upon fallback). |
| **Input Channel** | The channel transmitting mouse/keyboard events from the Viewer back to the Host. |
| **Fallback Relay** | Mode transmitting JPEG images through the Socket.IO server when WebRTC cannot connect. |

## 3. Actors

- **Host user** — opens the Host App, creates a session, approves or rejects the Viewer, revokes permissions, terminates the session.
- **Viewer user** — opens Viewer Web, enters code + OTP, views and controls once approved.
- **System** — automatically expires sessions/OTPs, records audit logs.

## 4. Functional requirements

### 4.1 Session lifecycle

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Host creates a session and receives a Session Code (9 digits) + OTP (6 digits). | Must |
| FR-02 | Host can regenerate the OTP; the old OTP becomes invalid immediately. | Should |
| FR-03 | Viewer sends a Join Request using Session Code + OTP. | Must |
| FR-04 | Host receives a Join Request notification and chooses Approve / Reject. | Must |
| FR-05 | When approved, Viewer receives the **Controller** (default) or **Observer** role chosen by the Host. | Must |
| FR-06 | Host can switch the Viewer between Controller ⇄ Observer at any time. | Should |
| FR-07 | Host or Viewer can terminate the session; the other party is notified. | Must |
| FR-08 | A session without a Viewer expires automatically after 10 minutes; OTP expires after 10 minutes or after a successful join. | Must |
| FR-09 | Each session has at most 1 Viewer at a time. | Must |
| FR-09a | An active session terminates automatically after at most **2 hours** from approval; Host and Viewer are warned 5 minutes in advance. | Must |
| FR-09b | Every session requires the Host to be present to approve; unattended access is not supported. | Must |

### 4.2 Video display

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | Viewer can view the Host's primary display in real time. | Must |
| FR-11 | System prioritizes WebRTC connection; if not established within 10 seconds, automatically switches to Fallback Relay. | Must |
| FR-12 | Viewer sees the active mode (WebRTC / Relay) and metrics for fps, RTT, bitrate. | Should |
| FR-13 | Viewer can toggle fullscreen. | Could |

### 4.3 Control

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | Controller controls the mouse: move, left/right/middle click, double-click, drag-and-drop, scroll. | Must |
| FR-21 | Controller can type all common keys: letters, numbers, special characters, Enter, Backspace, Tab, Esc, arrow keys, F1–F12, and combinations with Shift/Ctrl/Alt. | Must |
| FR-22 | Mouse position on the Host matches the position on the Viewer across all resolutions and DPI scales. | Must |
| FR-23 | Observer cannot send control events (blocked at both Viewer and server). | Must |
| FR-24 | Host has an emergency shortcut to immediately revoke control permissions. | Should |

### 4.4 Audit

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | Record events: session creation, Join Request, approve/reject, role change, termination, expiration — along with timestamp and IP. | Should |

## 5. Non-functional requirements

| ID | Attribute | Measurable requirement | Verification method |
|---|---|---|---|
| NFR-01 | Input latency | p95 < 150ms within LAN (WebRTC) | Measured in `benchmark.md` |
| NFR-02 | Frame rate | ≥ 15 fps at 1280px width (WebRTC); ≥ 5 fps on Relay | `getStats` / frame count |
| NFR-03 | Bandwidth | Relay ≤ 1.5 Mbps at 1280px, 5 fps | Measured in `benchmark.md` |
| NFR-04 | Transport security | All connections encrypted: HTTPS/WSS for API, DTLS-SRTP for WebRTC | Inspect deployment configuration |
| NFR-05 | Brute-force protection | At most 5 failed join attempts / IP / minute; code + OTP have sufficient entropy | e2e rate limit test |
| NFR-06 | Robustness | Server does not crash on malformed or oversized payloads (1 MB limit) | e2e test with invalid payloads |
| NFR-07 | Scalability | Run ≥ 2 server instances behind a load balancer while sessions remain functional | Integration test with Redis adapter |
| NFR-08 | Host App security | `contextIsolation: true`, `nodeIntegration: false`, whitelisted IPC, CSP enabled | Configuration review + test |
| NFR-09 | Code quality | TypeScript strict; domain coverage ≥ 90%; CI runs lint, typecheck, test | CI |
| NFR-10 | Observability | Structured logging (JSON) with `sessionId`; never log OTP, JWT, or screen content | Review + test |

## 6. Constraints

- Host App runs on **Windows 10/11** (primary demo platform). macOS is noted as "best effort" due to requiring Screen Recording and Accessibility permissions.
- Viewer runs on modern Chrome/Edge browsers.
- Stack: TypeScript, NestJS, React, Electron, Redis, PostgreSQL, coturn — chosen to match existing experience and documented in ADRs.
- Single developer, ~5 weeks duration.

## 7. Out of scope (v1)

File transfer, multiple monitors, audio, chat, user accounts/authentication, mobile apps, multiple simultaneous Viewers, session recording, unattended access.

## 8. Traceability of 2021 defects → requirements

| # | Defect in the 2021 version | Location | Remediating requirement |
|---|---|---|---|
| L1 | Letter keys could not be typed: only sent keydown for Shift/Ctrl, host only called `keyToggle(key,'up')` | `display.html`, `Client/app.js` | FR-21 |
| L2 | Browser key names did not match robotjs key names | `Client/app.js` | FR-21 |
| L3 | Mouse coordinates hard-coded `*4/3` | `Client/app.js` | FR-22 |
| L4 | Missing drag-and-drop, double-click, scroll; middle click treated as left click | `display.html`, `Client/app.js` | FR-20 |
| L5 | Viewer hard-coded connection to `http://localhost:5000` | `display.html` | FR-10 |
| L6 | `JSON.parse` without try/catch on server | `Server/index.js` | NFR-06 |
| L7 | Incorrect `&&` condition; `prompt` returning `null` caused a crash | `Client/app.js`, `display.html` | NFR-06 |
| L8 | Listeners re-registered on every Start; Stop before Start caused a crash | `Client/app.js` | FR-07 |
| L9 | Base64 PNG + JSON, `setInterval` without backpressure, ~2 fps | `Client/app.js` | FR-11, NFR-02, NFR-03 |
| L10 | `mousemove` unthrottled | `display.html` | NFR-01 |
| L11 | No authentication; room UUID unchanged between sessions; no host approval required | entire system | FR-01…FR-09, NFR-05 |
| L12 | Plain HTTP, unencrypted image and keystroke transmission | entire system | NFR-04 |
| L13 | Electron `nodeIntegration: true`, no `contextIsolation` | `Client/app.js` | NFR-08 |
| L14 | Public IP + port 5000 model required port forwarding, failed NAT traversal | `Server/index.js` | FR-11 |

## 9. Decisions made (2026-10-23)

| # | Question | Decision | Note |
|---|---|---|---|
| Q1 | OTP format | **6 digits** | Easy to read over the phone. A keyspace of 10⁶ is smaller than alphanumeric OTPs, so security relies on multiple layers: 9-digit Session Code, rate limit of 5 attempts/IP/minute, 10-minute OTP expiration, **locking the session after 5 consecutive failed attempts** (FR-03a), and Host must always approve. Analyzed in `05-security.md`. |
| Q2 | Unattended access | **Not supported** | FR-09b. Placed in "Out of scope". |
| Q3 | Maximum session duration | **2 hours** | FR-09a; warned 5 minutes in advance. |

Additions from Q1:

| ID | Requirement | Priority |
|---|---|---|
| FR-03a | After 5 consecutive failed OTP attempts for the same session, the session is locked from joining and Host is notified; Host can regenerate the OTP (FR-02) to unlock it. | Must |
