# AGENTS.md

Quy tắc chung cho mọi AI agent trong repo này (Claude, Gemini/Antigravity…).

Remote desktop: Host App (Electron) · Viewer Web (React) · Signaling API (NestJS + Redis). Bản 2021 đóng băng ở tag `v0-legacy-2021`; bản 2026 đang được xây theo `docs/`.

**Đọc trước mỗi task:** [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md). Quy trình phối hợp giữa các agent: [`docs/ai-workflow.md`](docs/ai-workflow.md).

## Quy tắc
- Nêu kế hoạch ngắn (file, lý do, test) trước khi sửa code. Một PR = một mục tiêu.
- TDD cho domain, use case, adapter, input mapper, schema protocol.
- AI không approve, không merge. Commit với tác giả `dunguyen-311201`.
- Task mâu thuẫn với `docs/` → dừng lại và hỏi. Đổi thiết kế → cập nhật LLD/protocol hoặc thêm ADR trong cùng PR; không sửa ADR đã Accepted.
- Payload qua mạng chỉ định nghĩa trong `packages/protocol` (zod); `docs/04-protocol.md` mô tả lại.
- Dùng TypeScript 5.9, không nâng lên 7 cho tới khi `typescript-eslint` hỗ trợ.
- `domain/` là TypeScript thuần: không I/O, không `Date.now()`, không import framework.
- Không log OTP, token, nội dung màn hình. Không đưa role vào JWT. Mọi thất bại join trả `401 INVALID_CREDENTIALS`.
- Không ghi số liệu hay tính năng chưa có thật vào README, docs, CV.
- `pnpm run check` phải xanh trước khi commit.

## Không làm
- Không merge nhánh `measure/baseline`. Không sửa `legacy/`.
- Không thêm thư viện lớn mà không có ADR. Không áp DDD ngoài Session & Access (ADR-006).

## Lệnh
Node 22, pnpm qua `corepack enable`: `pnpm i` · `pnpm run check` (format, lint, typecheck, kiến trúc, test + coverage — giống CI) · `pnpm test` · `pnpm build` · `pnpm --filter @pbl4/server test`.
Test tích hợp (`*.int.test.ts`, cần Redis thật): `pnpm test:integration` — dùng `REDIS_URL` nếu có, không thì Testcontainers (cần Docker).
Legacy (Node 14.17.1 qua nvm-windows, chỉ trên nhánh `measure/baseline`): `cd Server; npm i; npm start` · `cd Client; npm i; npm start`.

## Lưu ý
- Windows báo nhiều file "modified" chỉ do CRLF → kiểm tra `git diff --ignore-cr-at-eol --stat`, không commit những thay đổi đó.
- Legacy dùng `@jitsi/robotjs`. `Electron failed to install` → xoá `node_modules\electron`, `npm install electron@11`.
