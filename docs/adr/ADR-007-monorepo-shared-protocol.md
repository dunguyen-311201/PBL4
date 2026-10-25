# ADR-007 — pnpm + Turborepo monorepo with shared protocol package

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | NFR-06, NFR-09, 04-protocol, 06-test-strategy |

## Context
Three applications (Host App, Viewer Web, Signaling API) communicate over a shared protocol. In the 2021 version, event names and payloads were hand-written in each place and diverged: viewer sent `type-up`, server changed it to `type_up`, payloads alternated between JSON strings and objects.

## Decision
A monorepo using pnpm workspaces + Turborepo:
```
apps/host      apps/viewer      apps/server
packages/protocol   # zod schema → type, error codes, PROTOCOL_VERSION
packages/host-core  # pure Host logic, testable without Electron
packages/config     # shared tsconfig, eslint, vitest presets
```
Every network payload is defined once in `packages/protocol`; all three applications import types from it and validate at boundaries.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Three separate repos | Clear isolation | Must publish protocol package, manually sync versions | High overhead for a single developer |
| OpenAPI + AsyncAPI code generation | Industry standard, auto-generated docs | Adds codegen step; zod is sufficient for TypeScript end-to-end | Can generate AsyncAPI from zod later if needed |
| tRPC | Type-safe end-to-end | Unsuitable for Socket.IO events and DataChannel | Does not fit event-driven model |

## Consequences
- Positive: modifying a schema without updating a consumer causes a typecheck error; single command runs all tests; Turborepo rebuilds only affected packages. Also aligns with existing Turborepo + pnpm experience.
- Negative: Electron build configuration in a monorepo requires care (native module, `electron-rebuild`).
- Follow-up actions: first PR of Week 2 sets up monorepo + CI; contract test for every schema.
