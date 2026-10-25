# Architecture Decision Records

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-rewrite-instead-of-patch.md) | Rewrite the system instead of patching the 2021 version | Accepted |
| [ADR-002](ADR-002-webrtc-for-media.md) | WebRTC for video and input, Socket.IO for signaling only | Accepted |
| [ADR-003](ADR-003-relay-fallback.md) | Retain JPEG relay over Socket.IO as fallback | Accepted |
| [ADR-004](ADR-004-session-code-otp-approval.md) | Session code + OTP + host approval + short-lived JWT | Accepted |
| [ADR-005](ADR-005-redis-state-postgres-audit.md) | Redis for session state, PostgreSQL for audit only | Accepted |
| [ADR-006](ADR-006-clean-architecture-selective-ddd.md) | Clean architecture, tactical DDD for Session & Access only | Accepted |
| [ADR-007](ADR-007-monorepo-shared-protocol.md) | pnpm + Turborepo monorepo with shared protocol package | Accepted |

Template: [0000-template.md](0000-template.md). When changing a decision, do not edit the old ADR — create a new ADR and mark the old one as `Superseded by ADR-XXX`.
