# T-003 — `packages/host-core`: input mapping and pressed keys tracking

| | |
|---|---|
| Status | on-hold |
| Assignee | Gemini |
| Branch | `gemini/T-003` (created from `master`) |
| Related | **`docs/03-lld/input-control.md`** (primary specification) · FR-20…FR-24 · L1–L4 · 05-security E2 |

## Goal
Create a new package `packages/host-core` implementing `docs/03-lld/input-control.md` **faithfully**: transforming Viewer `InputEvent` into Host `HostAction`, blocking Observer, and releasing all pressed keys when needed. Pure TypeScript, without Electron/robotjs yet.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `docs/03-lld/input-control.md` — **all behavior comes from here**; if anything is ambiguous, ask before implementing
- `packages/protocol/src/input.ts` — `InputEvent` type
- `packages/protocol/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts}` — **configuration template** for the new package

## Scope (only these files may be created or changed)
- `packages/host-core/package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `README.md`
- `packages/host-core/src/{geometry,keymap,host-action,input-mapper,pressed-keys,index}.ts` and corresponding `*.test.ts` files
- `pnpm-lock.yaml` (automatically updated by pnpm)

## Allowed new dependencies
- `@pbl4/protocol: "workspace:*"` (dependency)
- devDependencies identical to `packages/protocol`: `@pbl4/config`, `@types/node`, `@vitest/coverage-v8`, `typescript`, `vitest` — **same versions** as in `packages/protocol/package.json`.
- Add nothing else.

## Contract
Conforms to §3 of the LLD (type names, function names, signatures). `package.json`: `"name": "@pbl4/host-core"`, `"type": "module"`, `exports` pointing to `dist/` like `packages/protocol`, scripts `build`, `typecheck`, `test`, `test:watch`, `test:coverage`. Coverage thresholds in `vitest.config.ts`: `{ lines: 90, branches: 85, functions: 90, statements: 90 }`.

## Acceptance criteria
- [ ] Entire table in §4.4 covered by table-driven tests (at least one case per table row; groups `A…Z`, `0…9`, `F1…F12`, numpad fully verified).
- [ ] Coordinates: `(0,0)` → `(0,0)`; `(1,1)` on 1920×1080 → `(1919,1079)`; `(0.5,0.5)` on 2560×1440 → `(1280,720)`; results are always integers within bounds.
- [ ] `ScreenGeometry` with `width` or `height` < 1 → `RangeError`.
- [ ] `pd`/`pu`/`dc` generate `move` before the button action (§4.3); `middle` remains `middle`.
- [ ] `wh` → a `scroll` with exact input `dx`, `dy`.
- [ ] `kd`/`ku` for letter keys generate `key down`/`key up` (fixes L1); `mods` ignored (test: `kd` with `mods.shift = true` still produces only **one** action).
- [ ] `code` not in the table (e.g. `"IntlRo"`) → `[]`.
- [ ] `role: 'observer'` → `[]` for **all** types of `t` (table-driven).
- [ ] `PressedKeys`: duplicate `down` counts only once; `up` for an unpressed key is ignored; `releaseAll()` returns `up` for keys first then mouse buttons (released at the last `move` coordinates, or `0,0`), after which `size === 0`.
- [ ] Package coverage ≥ thresholds; `pnpm run check` passes (including `dependency-cruiser`).

## Required tests
According to `docs/06-test-strategy.md` §5: test names describe behavior, AAA, table-driven for key map and Observer matrix.

## Out of scope
- Calling robotjs, Electron, screen capture, calculating real DPI.
- Modifying `packages/protocol`, `apps/*`, or documents in `docs/`.

## Gemini report
_(Filled in by Gemini when done.)_
