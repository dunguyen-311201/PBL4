# ADR-002 — WebRTC for video and input, Socket.IO for signaling only

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | FR-10, FR-20, FR-21, NFR-01…04, ADR-003 |

## Context
The 2021 version sent base64 PNG images over Socket.IO every 500ms, reaching ~2 fps with all images passing through the server. The new goals are input latency p95 < 150ms in LAN, ≥ 15 fps, and encrypted media transmission.

## Decision
- Video: Electron `desktopCapturer` → MediaStream → `RTCPeerConnection`, peer-to-peer when possible, via TURN when not.
- Input: two `RTCDataChannel`s — `input` (ordered, reliable) and `input-pointer` (unordered, `maxRetransmits: 0`).
- Socket.IO is used only for session management, signaling (offer/answer/ICE), and fallback mode.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Keep JPEG images over WebSocket (improved) | Simple, passes through all proxies | No inter-frame compression, TCP causes head-of-line blocking, all frames traverse server | Does not meet NFR-01/02, consumes server bandwidth — retained as fallback (ADR-003) |
| WebCodecs (H.264) + transmission over WebSocket | Good compression, encoder control | Must implement custom congestion control, jitter buffer; still traverses server, still TCP | Reinvents WebRTC built-in capabilities |
| SFU (mediasoup, LiveKit) | Scales to multiple viewers | Adds a heavy component for a 1-to-1 problem | Out of scope (1 Viewer/session) |

## Consequences
- Positive: video codec with inter-frame compression, UDP, built-in congestion control and DTLS-SRTP; server does not have to relay images in typical cases.
- Negative: requires STUN/TURN, harder to debug (`webrtc-internals`), automated testing is more complex (resolved via fake host in Playwright — 06 §3).
- Follow-up actions: coturn in docker-compose; temporary TURN credentials; Host blocks input when in Observer role because DataChannel does not pass through the server.
