# ADR-007 — Monorepo pnpm + Turborepo với package `protocol` dùng chung

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | NFR-06, NFR-09, 04-protocol, 06-test-strategy |

## Context
Ba ứng dụng (Host App, Viewer Web, Signaling API) cùng nói một giao thức. Ở bản 2021, tên sự kiện và payload được viết tay ở từng nơi và đã lệch nhau: viewer gửi `type-up`, server đổi thành `type_up`, payload lúc là chuỗi JSON lúc là object.

## Decision
Một monorepo pnpm workspaces + Turborepo:
```
apps/host      apps/viewer      apps/server
packages/protocol   # zod schema → type, mã lỗi, PROTOCOL_VERSION
packages/host-core  # logic Host thuần, test được không cần Electron
packages/config     # tsconfig, eslint, vitest preset dùng chung
```
Mọi payload đi qua mạng được định nghĩa một lần trong `packages/protocol`; cả ba ứng dụng import type từ đó và validate tại ranh giới.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| Ba repo riêng | Tách biệt rõ | Phải publish package protocol, đồng bộ phiên bản thủ công | Chi phí cao cho một người phát triển |
| OpenAPI + AsyncAPI sinh code | Chuẩn công nghiệp, có tài liệu tự động | Thêm bước codegen; zod đã đủ cho TypeScript end-to-end | Có thể sinh AsyncAPI từ zod sau này nếu cần |
| tRPC | Type-safe end-to-end | Không phù hợp Socket.IO events và DataChannel | Không khớp mô hình sự kiện |

## Consequences
- Tích cực: đổi schema mà quên sửa một bên sẽ lỗi typecheck; một lệnh chạy toàn bộ test; Turborepo chỉ chạy lại phần bị ảnh hưởng. Đồng thời trùng với kinh nghiệm Turborepo + pnpm đã có.
- Tiêu cực: cấu hình build Electron trong monorepo cần chú ý (native module, `electron-rebuild`).
- Việc phải làm: PR đầu tiên của Tuần 2 dựng monorepo + CI; contract test cho mọi schema.
