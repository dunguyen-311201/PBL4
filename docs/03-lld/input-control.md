# 03 — LLD: Input Control (packages/host-core)

| | |
|---|---|
| Trạng thái | v0.1 |
| Cập nhật | 2026-10-25 |
| Liên quan | FR-20…FR-24 · L1–L4, L10 (00-requirements §8) · 04-protocol §5 · 05-security E2, T2 · ADR-002, ADR-006, ADR-007 · 06-test-strategy §3 |

## 1. Trách nhiệm

Biến một `InputEvent` (04-protocol §5) mà Viewer gửi tới thành danh sách **hành động máy** (`HostAction`) để Host thực thi. Phần này là TypeScript thuần trong `packages/host-core`; nó **không** gọi robotjs, Electron hay đọc màn hình. Adapter trong `apps/host` (Tuần 3) nhận `HostAction` và gọi `@jitsi/robotjs`.

Tách như vậy để: (1) unit test toàn bộ logic mà không cần Electron (06-test-strategy §3); (2) dùng lại trong fake host chạy trên trình duyệt cho Playwright; (3) giữ chỗ chặn Observer ở đúng một nơi (05-security E2 — DataChannel không đi qua server).

Không làm: chụp màn hình, WebRTC, gọi robotjs, nhiều màn hình (ngoài phạm vi v1).

## 2. Cấu trúc

```
packages/host-core/
├─ src/
│  ├─ geometry.ts        # ScreenGeometry, toScreenPoint()
│  ├─ keymap.ts          # KeyboardEvent.code → tên phím của backend
│  ├─ host-action.ts     # union HostAction
│  ├─ input-mapper.ts    # mapInput(event, context) → HostAction[]
│  ├─ pressed-keys.ts    # theo dõi phím/nút đang giữ, releaseAll()
│  └─ index.ts
└─ package.json          # phụ thuộc @pbl4/protocol (chỉ type + schema)
```

## 3. Hợp đồng

```ts
import type { InputEvent } from '@pbl4/protocol';

export type Role = 'controller' | 'observer';
export type MouseButton = 'left' | 'middle' | 'right';

/** Kích thước màn hình theo đúng hệ toạ độ mà backend input dùng (adapter tự tính, gồm DPI). */
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

## 4. Quy tắc

### 4.1 Vai trò (FR-23, E2)
`role === 'observer'` → trả `[]` cho **mọi** sự kiện. Đây là lớp chặn thứ hai sau server (relay); với DataChannel nó là lớp duy nhất.

### 4.2 Toạ độ (FR-22, sửa L3)
- Đầu vào `x, y ∈ [0, 1]` theo khung hình Viewer đang hiển thị (đã được schema đảm bảo).
- `toScreenPoint(x, y, screen) = { x: round(x × (width − 1)), y: round(y × (height − 1)) }` → `0 ≤ x ≤ width−1`, `0 ≤ y ≤ height−1`, luôn là số nguyên.
- Không có hằng số hard-code kiểu `*4/3` của bản 2021. DPI do adapter xử lý khi tạo `ScreenGeometry`.
- `width` hoặc `height` < 1 → `mapInput` ném `RangeError` (cấu hình sai, không phải input sai).

### 4.3 Chuột (FR-20, sửa L4)

| `t` | Hành động |
|---|---|
| `pm` | `[move]` |
| `pd` | `[move, button down]` — di chuột tới điểm trước để kéo thả bắt đầu đúng chỗ |
| `pu` | `[move, button up]` |
| `dc` | `[move, doubleClick]` |
| `wh` | `[scroll {dx, dy}]` — giữ nguyên quy ước trình duyệt (dy > 0 = cuộn xuống), adapter tự đổi đơn vị và chiều theo nền tảng |

Nút giữa là `middle`, không bị đổi thành trái như bản 2021.

### 4.4 Bàn phím (FR-21, sửa L1, L2)
- Dùng `code` (phím **vật lý**, không phụ thuộc bố cục bàn phím), **không** dùng `key`. Ký tự cuối cùng do bố cục bàn phím của Host quyết định; nhờ vậy `Shift` + `Digit1` ra `!` mà không phải ánh xạ ký tự đặc biệt.
- `kd` → `key down`, `ku` → `key up`, cho **mọi** phím (bản 2021 chỉ có keyup cho phím thường — L1).
- `mods` trong sự kiện **bị bỏ qua**: phím bổ trợ đã được gửi thành `kd`/`ku` riêng; dùng thêm `mods` sẽ nhấn hai lần.
- `code` không có trong bảng → `[]` (bỏ qua, không ném lỗi).

**Bảng ánh xạ `code` → tên phím** (tên theo `@jitsi/robotjs`):

| Nhóm | `code` | Tên phím |
|---|---|---|
| Chữ | `KeyA` … `KeyZ` | `a` … `z` |
| Số | `Digit0` … `Digit9` | `0` … `9` |
| Numpad | `Numpad0` … `Numpad9` | `numpad_0` … `numpad_9` |
| Chức năng | `F1` … `F12` | `f1` … `f12` |
| Điều hướng | `ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight` | `up` `down` `left` `right` |
| | `Home` `End` `PageUp` `PageDown` | `home` `end` `pageup` `pagedown` |
| Soạn thảo | `Enter` `NumpadEnter` `Backspace` `Delete` `Insert` `Tab` `Escape` `Space` | `enter` `enter` `backspace` `delete` `insert` `tab` `escape` `space` |
| Bổ trợ | `ShiftLeft` `ShiftRight` | `shift` `right_shift` |
| | `ControlLeft` `ControlRight` | `control` `right_control` |
| | `AltLeft` `AltRight` | `alt` `right_alt` |
| | `MetaLeft` `MetaRight` | `command` `command` |
| Dấu | `Minus` `Equal` `BracketLeft` `BracketRight` `Backslash` | `-` `=` `[` `]` `\` |
| | `Semicolon` `Quote` `Comma` `Period` `Slash` `Backquote` | `;` `'` `,` `.` `/` `` ` `` |
| Khác | `PrintScreen` | `printscreen` |

### 4.5 Phím/nút đang giữ (tránh kẹt phím)
Nếu Viewer mất kết nối khi đang giữ `Shift` hay chuột trái, Host sẽ bị kẹt. `PressedKeys` theo dõi trạng thái:

```ts
export class PressedKeys {
  /** Ghi nhận các hành động đã thực thi. */
  track(actions: readonly HostAction[]): void;
  /** Hành động `up` cho mọi phím/nút còn đang giữ (phím trước, chuột sau), rồi xoá trạng thái. */
  releaseAll(): HostAction[];
  readonly size: number;
}
```
Host gọi `releaseAll()` khi: kênh input đóng, Viewer bị chuyển sang Observer, phiên kết thúc. `down` lặp lại cho cùng một phím chỉ tính một lần; `up` cho phím không giữ thì bỏ qua.

Nút chuột khi `releaseAll` được nhả tại toạ độ của lần `move` cuối cùng đã track (hoặc `0,0` nếu chưa có).

## 5. Kiểm thử
- Bảng §4.4 kiểm **toàn bộ** bằng test table-driven.
- Toạ độ: các góc (0,0), (1,1), giữa; màn hình 1920×1080 và 2560×1440; kết quả luôn là số nguyên trong biên.
- Mỗi loại sự kiện chuột ra đúng chuỗi hành động §4.3.
- Observer: mọi biến thể `InputEvent` → `[]`.
- `PressedKeys`: down lặp, up không giữ, releaseAll thứ tự và làm rỗng.
- Coverage `packages/host-core` ≥ 90% (06-test-strategy §7).
