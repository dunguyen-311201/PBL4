# T-001 — Simple infrastructure adapters: clock, code/OTP/ID generators, argon2 hasher

| | |
|---|---|
| Status | done |
| Assignee | Gemini |
| Branch | `gemini/T-001` |
| Related | `docs/03-lld/session-access.md` §2, §4 · `docs/05-security.md` S1, I3 · FR-01 |

## Goal
Implement the 5 existing application layer ports with real adapters so that the Signaling API can run without fakes. These are small, stateless adapters.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `apps/server/src/session-access/application/ports/generators.ts`
- `apps/server/src/session-access/application/ports/secret-hasher.ts`
- `docs/03-lld/session-access.md` §2 (directory tree), §4 (ports)

## Scope (only these files may be created or changed)
- `apps/server/src/session-access/infrastructure/system-clock.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/random-code.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/random-otp.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/uuid.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/argon2.hasher.ts` (+ `.test.ts`)
- `apps/server/package.json` (only add the dependency below)
- `pnpm-lock.yaml` (automatically updated by pnpm)

## Allowed new dependencies
- `argon2` (`apps/server` dependency) — already selected in LLD/ADR-004.
- Otherwise add **nothing**. Use `node:crypto` for randomness.

## Contract

| Class | Port implemented | Behavior |
|---|---|---|
| `SystemClock` | `Clock` | `now()` returns `new Date()` |
| `RandomCodeGenerator` | `CodeGenerator` | `next()` returns a 9-digit string, first digit 1–9, using `crypto.randomInt` (do not use `Math.random`) |
| `RandomOtpGenerator` | `OtpGenerator` | `next()` returns an exact 6-digit string, **leading zeros allowed** (`"000123"` is valid), using `crypto.randomInt` |
| `UuidGenerator` | `IdGenerator` | `uuid()` returns `crypto.randomUUID()` |
| `Argon2Hasher` | `SecretHasher` | `hash(plain)` uses **argon2id**; `verify(plain, hash)` returns `false` (does not throw) when `hash` is malformed; accepts `{ memoryCost, timeCost, parallelism }` configuration parameters via constructor, defaulting to OWASP recommendations (memoryCost 19456 KiB, timeCost 2, parallelism 1) |

Each class `implements` the exact corresponding port (`import type` from `../../application/ports/...`).

## Acceptance criteria
- [x] `RandomCodeGenerator`: 10 000 calls all match `/^[1-9][0-9]{8}$/` and are accepted by `SessionCode.of()`.
- [x] `RandomOtpGenerator`: 10 000 calls all match `/^[0-9]{6}$/`; has a test proving leading zeros are preserved (mock `randomInt` returning `123` → `"000123"`).
- [x] No file uses `Math.random`.
- [x] `Argon2Hasher.hash` returns a string starting with `$argon2id$`; hashing the same OTP twice produces two different strings (salted).
- [x] `verify` correct → `true`; wrong OTP → `false`; garbage hash (`"not-a-hash"`) → `false`.
- [x] Hasher tests use small parameters (e.g. `memoryCost: 1024, timeCost: 1`) to run fast.
- [x] `pnpm run check` passes (including `dependency-cruiser`: infrastructure is not imported back by domain/application).

## Required tests
One `*.test.ts` file per adapter alongside the source file, following the conventions of `docs/06-test-strategy.md` §5 (test names describe behavior, Arrange–Act–Assert).

## Out of scope
- `JwtTokenService`, `RedisSessionRepository`, scheduler, NestJS module — other tasks.
- Modifying ports, use cases, domain, or documentation.

## Gemini report

### What was done
1. Installed dependency `argon2` (^0.45.1) in `apps/server`.
2. Created 5 infrastructure adapters along with corresponding unit tests following the exact contracts of the ports:
   - `SystemClock` (`system-clock.ts`, `system-clock.test.ts`): implements the `Clock` port, returns `new Date()`.
   - `RandomCodeGenerator` (`random-code.generator.ts`, `random-code.generator.test.ts`): implements the `CodeGenerator` port, generates a 9-digit code (first digit 1–9) using `crypto.randomInt`, accepted by `SessionCode.of()`.
   - `RandomOtpGenerator` (`random-otp.generator.ts`, `random-otp.generator.test.ts`): implements the `OtpGenerator` port, generates a 6-digit OTP (preserving leading zeros with `padStart(6, '0')`) using `crypto.randomInt`.
   - `UuidGenerator` (`uuid.generator.ts`, `uuid.generator.test.ts`): implements the `IdGenerator` port, generates UUID v4 using `crypto.randomUUID()`.
   - `Argon2Hasher` (`argon2.hasher.ts`, `argon2.hasher.test.ts`): implements the `SecretHasher` port, hashes with argon2id (OWASP defaults: memoryCost 19456 KiB, timeCost 2, parallelism 1), verifies safely without throwing exceptions on malformed hashes.
3. Strict TDD process: write tests first (Red) -> minimal implementation (Green) -> format & typecheck.

### Files created / changed
- `apps/server/package.json`
- `pnpm-lock.yaml`
- `apps/server/src/session-access/infrastructure/system-clock.ts`
- `apps/server/src/session-access/infrastructure/system-clock.test.ts`
- `apps/server/src/session-access/infrastructure/crypto/random-code.generator.ts`
- `apps/server/src/session-access/infrastructure/crypto/random-code.generator.test.ts`
- `apps/server/src/session-access/infrastructure/crypto/random-otp.generator.ts`
- `apps/server/src/session-access/infrastructure/crypto/random-otp.generator.test.ts`
- `apps/server/src/session-access/infrastructure/crypto/uuid.generator.ts`
- `apps/server/src/session-access/infrastructure/crypto/uuid.generator.test.ts`
- `apps/server/src/session-access/infrastructure/crypto/argon2.hasher.ts`
- `apps/server/src/session-access/infrastructure/crypto/argon2.hasher.test.ts`
- `.ai/tasks/T-001-crypto-adapters.md`

### Commands run
- `pnpm --filter @pbl4/server add argon2`
- `pnpm --filter @pbl4/server test`
- `pnpm format`
- `pnpm lint`
- `pnpm --filter @pbl4/server typecheck`
- `pnpm run check` (all steps format, lint, typecheck, depcruise, test:coverage 100% green)

### Updates following Review T-001
1. **SHOULD 1 (Spy cleanup)**: Replaced manual `mockRestore()` calls at the end of tests with an `afterEach(() => { vi.restoreAllMocks(); })` hook in test files `random-code.generator.test.ts`, `random-otp.generator.test.ts`, `uuid.generator.test.ts` to avoid mock leakage when an `expect` fails.
2. **SHOULD 2 (Argon2 parameter source)**: Adjusted comment in `argon2.hasher.ts` from "OWASP minimum recommendations for Argon2id (RFC 9106)" to "OWASP Password Storage Cheat Sheet minimum recommendations for Argon2id".
3. **NIT 3 (Dependencies order)**: Moved `dependencies` before `devDependencies` in `apps/server/package.json`.
4. **NIT 4 (Error swallowing comment)**: Added a comment in `Argon2Hasher.verify` clarifying that error swallowing is an intentional design choice to prevent throwing exceptions on corrupted hashes.

### Unsure
- None. All acceptance criteria met and verified by tests.
