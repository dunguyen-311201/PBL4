# ADR-006 — Clean architecture, DDD for Session & Access only

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | NFR-09, 02-domain-model §1, 03-lld/session-access §2–3, 06-test-strategy §3 |

## Context
The system has one part containing genuine business rules (session lifecycle, OTP, approval, roles, expiration) and many purely technical parts (signaling forwarding, frame relay, key mapping). Applying a heavy architectural template everywhere would create many intermediate layers that provide no value.

## Decision
- **Session & Access**: full clean/hexagonal architecture (domain → application → infrastructure/presentation) and tactical DDD (`RemoteSession` aggregate, value objects, domain events, repository port).
- **Signaling, Relay**: thin application services calling `SessionAccessQuery`; no separate domain model.
- **Audit**: subscriber persisting events.
- **Client side (Host/Viewer)**: pure logic extracted into `packages/host-core` for testability; no DDD.
- Dependency rules are verified automatically by `dependency-cruiser` in CI.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Standard NestJS "service + repository" | Fewer files, familiar | Business rules scattered across services and controllers; difficult to test purely; prone to invariant violations | Session & Access has enough rules to require an aggregate |
| DDD + clean architecture across all modules | Uniform | Many empty layers for modules that merely forward data | Over-engineering |

## Consequences
- Positive: business rules centralized in one place, fast tests without I/O; technical modules remain lightweight.
- Negative: two styles within the same codebase — requires README of `apps/server` to explain clearly which module follows which pattern.
- Follow-up actions: `dependency-cruiser` rules; test data builders for aggregates.
