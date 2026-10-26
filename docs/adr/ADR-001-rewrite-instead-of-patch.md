# ADR-001 — Rewrite the system instead of patching the 2021 version

| | |
|---|---|
| Status | Accepted |
| Date | 2026-10-23 |
| Related | [00-requirements.md §8](../00-requirements.md), ADR-002, ADR-004, ADR-006 |

## Context
The 2021 version has 14 recorded bugs (L1–L14), many of which reside in the architectural model itself rather than implementation details:
- room is a static UUID, without authentication or host approval step;
- all images traverse the server as base64 PNGs, without backpressure;
- server must expose public ports, cannot traverse NAT;
- Electron runs with `nodeIntegration: true`.

The new goals (WebRTC, authenticated sessions, multi-instance support, TDD) alter virtually every component.

## Decision
Freeze the 2021 version at tag `v0-legacy-2021` (directory `legacy/`), with no further edits. Build the new system in a TypeScript monorepo according to the design in `docs/`. Bugs from the legacy version become requirements and test cases for the new version.

## Alternatives
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| Incrementally patch the 2021 version | Runnable results sooner | Most patched code will be replaced when moving to WebRTC and adding authentication; pure JS, no tests, hard to apply TDD | Non-reusable effort |
| Minimal patching before rewriting | Temporary demo available | Spends 1 week on code that will be discarded | Design documentation is already available to present during interviews in the meantime |

## Consequences
- Positive: clean design from the start; every part covered by tests; repo history clearly shows the progression from the legacy version to the redesign.
- Negative: no runnable new version for the first ~2 weeks; legacy version remains buggy.
- Follow-up actions: README clearly states the status "redesign in progress"; measure baseline of the legacy version before freezing to have comparison figures.
