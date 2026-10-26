# ADR-003 — Retain JPEG relay over Socket.IO as fallback

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | FR-11, NFR-02, NFR-03, ADR-002, 05-security I2 |

## Context
WebRTC may fail to connect: network blocks UDP, enterprise proxy inspects packets, or TURN is unreachable. In that case the user cannot see anything.

## Decision
If ICE fails or times out after 10 seconds, Viewer requests `media.fallback`; Host switches to streaming binary JPEG (reduced resolution, ~70 quality) over Socket.IO with an ack mechanism: sends a new frame only when the previous frame has been acknowledged by the Viewer or after 1 second timeout. Input travels via `relay.input` and is verified by the server for appropriate roles.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Use TURN over TCP/TLS 443 only | No second path needed | Some networks still block it; extra TLS configuration for coturn | Still deploy TURN/443 but insufficient as a final resort |
| No fallback | Less code | Complete failure on some networks | Poor user experience, hard to demo on unfamiliar networks |
| WebSocket relay without ack | Simple | Frames queue up when network is slow, latency grows unbounded | This is exactly bug L9 of the 2021 version |

## Consequences
- Positive: works anywhere HTTPS works; reuses experience from the 2021 version.
- Negative: server sees frames (accepted risk, 05-security I2); consumes server bandwidth; lower quality than WebRTC.
- Follow-up actions: limit fps/resolution in relay; clearly display `relay` mode on Viewer; measure dedicated "v1 Relay" column in benchmark.
