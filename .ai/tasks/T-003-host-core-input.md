# T-003 — `packages/host-core`: ánh xạ input và theo dõi phím đang giữ

| | |
|---|---|
| Trạng thái | ready |
| Người làm | Gemini |
| Nhánh | `gemini/T-003` (tạo từ `master`) |
| Liên quan | **`docs/03-lld/input-control.md`** (đặc tả chính) · FR-20…FR-24 · L1–L4 · 05-security E2 |

## Mục tiêu
Tạo package mới `packages/host-core` hiện thực **đúng** `docs/03-lld/input-control.md`: biến `InputEvent` của Viewer thành `HostAction` cho Host, chặn Observer, và nhả mọi phím đang giữ khi cần. TypeScript thuần, chưa có Electron/robotjs.

## Đọc trước
- `AGENTS.md`, `GEMINI.md`
- `docs/03-lld/input-control.md` — **mọi hành vi lấy từ đây**; nếu thấy chỗ mơ hồ, hỏi trước khi làm
- `packages/protocol/src/input.ts` — kiểu `InputEvent`
- `packages/protocol/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts}` — **làm mẫu** cấu hình cho package mới

## Phạm vi (chỉ được tạo/sửa các file này)
- `packages/host-core/package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `README.md`
- `packages/host-core/src/{geometry,keymap,host-action,input-mapper,pressed-keys,index}.ts` và các file `*.test.ts` tương ứng
- `pnpm-lock.yaml` (do pnpm tự cập nhật)

## Dependency được phép thêm
- `@pbl4/protocol: "workspace:*"` (dependency)
- devDependencies giống `packages/protocol`: `@pbl4/config`, `@types/node`, `@vitest/coverage-v8`, `typescript`, `vitest` — **cùng phiên bản** như trong `packages/protocol/package.json`.
- Không thêm gì khác.

## Hợp đồng
Đúng §3 của LLD (tên kiểu, tên hàm, chữ ký). `package.json`: `"name": "@pbl4/host-core"`, `"type": "module"`, `exports` trỏ tới `dist/` như `packages/protocol`, scripts `build`, `typecheck`, `test`, `test:watch`, `test:coverage`. Ngưỡng coverage trong `vitest.config.ts`: `{ lines: 90, branches: 85, functions: 90, statements: 90 }`.

## Tiêu chí chấp nhận
- [ ] Toàn bộ bảng §4.4 có test table-driven (mỗi dòng của bảng ít nhất một ca; nhóm `A…Z`, `0…9`, `F1…F12`, numpad kiểm hết).
- [ ] Toạ độ: `(0,0)` → `(0,0)`; `(1,1)` trên 1920×1080 → `(1919,1079)`; `(0.5,0.5)` trên 2560×1440 → `(1280,720)`; kết quả luôn là số nguyên trong biên.
- [ ] `ScreenGeometry` có `width` hoặc `height` < 1 → `RangeError`.
- [ ] `pd`/`pu`/`dc` sinh `move` trước rồi mới tới hành động nút (§4.3); `middle` giữ nguyên là `middle`.
- [ ] `wh` → một `scroll` với đúng `dx`, `dy` đầu vào.
- [ ] `kd`/`ku` cho phím chữ sinh `key down`/`key up` (sửa L1); `mods` bị bỏ qua (test: `kd` với `mods.shift = true` vẫn chỉ ra **một** hành động).
- [ ] `code` không có trong bảng (ví dụ `"IntlRo"`) → `[]`.
- [ ] `role: 'observer'` → `[]` cho **mọi** loại `t` (table-driven).
- [ ] `PressedKeys`: `down` lặp chỉ tính một; `up` cho phím không giữ bị bỏ qua; `releaseAll()` trả `up` cho phím trước rồi nút chuột (nhả tại toạ độ `move` cuối, hoặc `0,0`), sau đó `size === 0`.
- [ ] Coverage package ≥ ngưỡng; `pnpm run check` xanh (gồm `dependency-cruiser`).

## Test bắt buộc
Theo `docs/06-test-strategy.md` §5: tên test mô tả hành vi, AAA, table-driven cho bảng phím và ma trận Observer.

## Ngoài phạm vi
- Gọi robotjs, Electron, chụp màn hình, tính DPI thật.
- Sửa `packages/protocol`, `apps/*`, tài liệu trong `docs/`.

## Báo cáo của Gemini
_(Gemini điền sau khi làm xong.)_
