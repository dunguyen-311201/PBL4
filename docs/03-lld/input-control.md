# 03 — LLD: Input Control (packages/host-core)

| | |
|---|---|
| Status | v0.1 |
| Updated | 2026-10-25 |
| Related | FR-20…FR-24 · L1–L4, L10 (00-requirements §8) · 04-protocol §5 · 05-security E2, T2 · ADR-002, ADR-006, ADR-007 · 06-test-strategy §3 |

## 1. Responsibilities

Convert an `InputEvent` (04-protocol §5) sent by the Viewer into a list of **machine actions** (`HostAction`) for the Host to execute. This part is pure TypeScript in `packages/host-core`; it does **not** call robotjs, Electron, or read the screen. The adapter in `apps/host` (Week 3) receives `HostAction` and calls `@jitsi/robotjs`.

Separated this way to: (1) unit test the entire logic without Electron (06-test-strategy §3); (2) reuse in a fake host running in the browser for Playwright; (3) keep the Observer blocking logic in exactly one place (05-security E2 — DataChannel does not pass through the server).

Does not do: screen capture, WebRTC, calling robotjs, multi-monitor (out of scope for v1).

## 2. Structure

```
packages/host-core/
├─ src/
│  ├─ geometry.ts        # ScreenGeometry, toScreenPoint()
│  ├─ keymap.ts          # KeyboardEvent.code → backend key name
│  ├─ host-action.ts     # union HostAction
│  ├─ input-mapper.ts    # mapInput(event, context) → HostAction[]
│  ├─ pressed-keys.ts    # tracks pressed keys/buttons, releaseAll()
│  └─ index.ts
└─ package.json          # depends on @pbl4/protocol (type + schema only)
```

## 3. Contract

```ts
import type { InputEvent } from '@pbl4/protocol';

export type Role = 'controller' | 'observer';
export type MouseButton = 'left' | 'middle' | 'right';

/** Screen dimensions in the exact coordinate system used by the input backend (calculated by the adapter, including DPI). */
export interface ScreenGeometry { readonly width: number; readonly height: number }

export type HostAction =
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'button'; readonly button: MouseButton; readonly state: 'down' | 'up'; readonly x: number; readonly y: number }
  | { readonly type: 'doubleClick'; readonly button: MouseButton; readonly x: number; readonly y: number }
  | { readonly type: 'scroll'; readonly dx: number; readonly dy: number }
  | { readonly type: 'key'; readonly key: string; readonly state: 'down' | 'up' };

export interface MapContext {
  readonly role: Role;
  readonly screen: ScreenGeometry;
}

export function mapInput(event: InputEvent, ctx: MapContext): HostAction[];
```

## 4. Rules

### 4.1 Role (FR-23, E2)
`role === 'observer'` → returns `[]` for **all** events. This is the second blocking layer after the server (relay); for DataChannel it is the only layer.

### 4.2 Coordinates (FR-22, fixes L3)
- Input `x, y ∈ [0, 1]` relative to the frame displayed by the Viewer (guaranteed by the schema).
- `toScreenPoint(x, y, screen) = { x: round(x × (width − 1)), y: round(y × (height − 1)) }` → `0 ≤ x ≤ width−1`, `0 ≤ y ≤ height−1`, always an integer.
- No hard-coded constants like `*4/3` from the 2021 version. DPI is handled by the adapter when creating `ScreenGeometry`.
- `width` or `height` < 1 → `mapInput` throws `RangeError` (misconfiguration, not bad input).

### 4.3 Mouse (FR-20, fixes L4)

| `t` | Action |
|---|---|
| `pm` | `[move]` |
| `pd` | `[move, button down]` — moves mouse to the point first so drag-and-drop starts at the right place |
| `pu` | `[move, button up]` |
| `dc` | `[move, doubleClick]` |
| `wh` | `[scroll {dx, dy}]` — preserves browser conventions (dy > 0 = scroll down), adapter converts units and direction per platform |

The middle button is `middle`, not changed to left like in the 2021 version.

### 4.4 Keyboard (FR-21, fixes L1, L2)
- Use `code` (**physical** key, keyboard-layout agnostic), **not** `key`. The final character is determined by the Host's keyboard layout; thus `Shift` + `Digit1` produces `!` without special character mapping.
- `kd` → `key down`, `ku` → `key up`, for **all** keys (the 2021 version only had keyup for normal keys — L1).
- `mods` in the event **is ignored**: modifier keys are already sent as separate `kd`/`ku` events; using `mods` additionally would press twice.
- `code` not in the table → `[]` (ignored, no error thrown).

**Mapping table from `code` → key name** (names per `@jitsi/robotjs`):

| Group | `code` | Key name |
|---|---|---|
| Letters | `KeyA` … `KeyZ` | `a` … `z` |
| Digits | `Digit0` … `Digit9` | `0` … `9` |
| Numpad | `Numpad0` … `Numpad9` | `numpad_0` … `numpad_9` |
| Function | `F1` … `F12` | `f1` … `f12` |
| Navigation | `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight` | `up` `down` `left` `right` |
| | `Home` `End` `PageUp` `PageDown` | `home` `end` `pageup` `pagedown` |
| Editing | `Enter` `NumpadEnter` `Backspace` `Delete` `Insert` `Tab` `Escape` `Space` | `enter` `enter` `backspace` `delete` `insert` `tab` `escape` `space` |
| Modifiers | `ShiftLeft` `ShiftRight` | `shift` `right_shift` |
| | `ControlLeft` `ControlRight` | `control` `right_control` |
| | `AltLeft` `AltRight` | `alt` `right_alt` |
| | `MetaLeft` `MetaRight` | `command` `command` |
| Punctuation | `Minus` `Equal` `BracketLeft` `BracketRight` `Backslash` | `-` `=` `[` `]` `\` |
| | `Semicolon` `Quote` `Comma` `Period` `Slash` `Backquote` | `;` `'` `,` `.` `/` `` ` `` |
| Other | `PrintScreen` | `printscreen` |

### 4.5 Pressed keys/buttons (avoid stuck keys)
If the Viewer disconnects while holding `Shift` or left click, the Host will be stuck. `PressedKeys` tracks state:

```ts
export class PressedKeys {
  /** Records executed actions. */
  track(actions: readonly HostAction[]): void;
  /** `up` actions for all currently held keys/buttons (keys first, mouse second), then clears state. */
  releaseAll(): HostAction[];
  readonly size: number;
}
```
Host calls `releaseAll()` when: the input channel closes, the Viewer is switched to Observer, the session terminates. Repeated `down` for the same key is counted only once; `up` for an unheld key is ignored.

Mouse buttons upon `releaseAll` are released at the coordinates of the last tracked `move` (or `0,0` if none).

## 5. Testing
- Table §4.4 is verified **in full** using table-driven tests.
- Coordinates: corners (0,0), (1,1), center; screens 1920×1080 and 2560×1440; results are always integers within bounds.
- Each mouse event type produces the exact action sequence in §4.3.
- Observer: all `InputEvent` variants → `[]`.
- `PressedKeys`: repeated down, up when not held, releaseAll ordering and clearing.
- Coverage for `packages/host-core` ≥ 90% (06-test-strategy §7).
