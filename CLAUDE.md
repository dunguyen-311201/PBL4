# CLAUDE.md — PBL4 Remote Desktop

Hướng dẫn cho AI agent (Claude và các công cụ tương tự) làm việc trong repo này. Đọc hết file này trước khi làm bất cứ việc gì.

## 1. Dự án

Remote desktop: **Host App** (Electron) chia sẻ màn hình và nhận input; **Viewer Web** (React) xem và điều khiển; **Signaling API** (NestJS) quản lý phiên, xác thực, signaling WebRTC và fallback relay.

- Bản 2021 (đồ án đại học) được đóng băng tại tag `v0-legacy-2021` → sẽ nằm trong `legacy/`.
- Bản 2026 đang được **thiết kế lại**. Thiết kế đã xong cho context Session & Access; chưa có code mới.
- **Điểm vào:** [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) — trạng thái, quyết định, bản đồ tài liệu, việc tiếp theo.

## 2. Trạng thái hiện tại

- Nhánh `master`: vẫn là code 2021 (`Client/`, `Server/`, `app/`).
- Nhánh `measure/baseline`: **tạm**, chỉ để đo baseline; đổi `robotjs` → `@jitsi/robotjs`. **Không bao giờ merge.**
- Việc kế tiếp: hoàn tất Ngày 1 (`chore/freeze-legacy`), rồi PR 2.1 dựng monorepo. Xem `docs/PROJECT_SUMMARY.md` §7.

## 3. Nguồn sự thật

| Câu hỏi | Đọc |
|---|---|
| Hệ thống phải làm gì? | `docs/00-requirements.md` (FR-xx, NFR-xx) |
| Các thành phần nói chuyện với nhau thế nào? | `docs/01-hld.md` |
| Luật nghiệp vụ của phiên? | `docs/02-domain-model.md` (invariants I1–I9, bảng chuyển trạng thái §4.6) |
| Code server tổ chức thế nào? | `docs/03-lld/session-access.md` |
| Payload, sự kiện, mã lỗi? | `packages/protocol` (zod) — `docs/04-protocol.md` mô tả lại; **code thắng nếu lệch** |
| Bảo mật? | `docs/05-security.md` |
| Viết test thế nào? | `docs/06-test-strategy.md` |
| Vì sao chọn X? | `docs/adr/` |

Nếu yêu cầu của một task mâu thuẫn với tài liệu, **dừng lại và hỏi**, không tự chọn.

## 4. Quy tắc làm việc (AI-Assisted Engineering Handbook)

1. **Plan trước code.** Trước khi sửa code, nêu kế hoạch ngắn: file nào, vì sao, test nào. Chờ đồng ý với thay đổi lớn.
2. **Diff nhỏ.** Một PR = một mục tiêu. Không gộp refactor với tính năng.
3. **TDD** cho domain, use case, input mapper, schema protocol: test đỏ → code tối thiểu → refactor.
4. **AI không approve, không merge.** Agent mở PR hoặc để lại thay đổi; con người review và merge.
5. **Thiết kế đổi thì tài liệu đổi** trong cùng PR (LLD, protocol hoặc ADR mới). Không sửa ADR đã Accepted — tạo ADR mới và đánh dấu `Superseded by`.
6. **Không bịa.** Không ghi số liệu, tính năng hay công nghệ chưa có thật vào README, docs hay CV.

## 5. Quy ước code

- TypeScript `strict`. Không `any` nếu không có lý do ghi trong comment.
- Đặt tên theo **ubiquitous language** (02-domain-model §2): `RemoteSession`, `SessionCode`, `JoinRequest`, `approveJoin`, `ParticipantRole`…
- **Quy tắc phụ thuộc** (server): `presentation → application → domain`; `infrastructure` hiện thực port. `domain` không import `@nestjs/*`, `ioredis`, `jsonwebtoken`, `argon2` hay bất kỳ I/O nào. Kiểm tra bằng `dependency-cruiser`.
- Domain nhận `now: Date` và `SessionPolicy` từ ngoài; không gọi `Date.now()` trong domain.
- Lỗi nghiệp vụ là lớp con `DomainError` có `code` ổn định; ánh xạ sang HTTP/WS theo `04-protocol.md` §7.
- Mọi payload qua mạng phải có schema trong `packages/protocol` và được validate tại ranh giới.
- **Không log** OTP, token, header `authorization`, nội dung màn hình.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, preload + `contextBridge`, IPC theo whitelist.

## 6. Test

- Vitest cho toàn monorepo; Testcontainers cho Redis/Postgres; Supertest + `socket.io-client` cho e2e; Playwright cho UI.
- Tên test mô tả hành vi: `it("locks the session after the 5th wrong OTP")`.
- Dùng test data builder (`aSession().waitingForViewer().build()`), table-driven cho ma trận trạng thái.
- Không `sleep` trong test; điều khiển thời gian bằng `FixedClock` hoặc TTL rút gọn (`SESSION_POLICY_*`).
- Ngưỡng coverage: domain ≥ 90%, application ≥ 85%, `protocol`/`host-core` ≥ 90%.

## 7. Git

- Tác giả commit: `dunguyen-311201` <dunguyenhuu.it2019@gmail.com>.
- Nhánh: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…` → PR vào `master` (sau này `develop`).
- Commit theo Conventional Commits: `feat(session): approve join request`.
- Trên Windows, nhiều file có thể hiện "modified" chỉ vì CRLF/LF. Kiểm tra `git diff --ignore-cr-at-eol --stat` và không commit những thay đổi đó.
- Không sửa nội dung trong `legacy/` (trừ khi task nói rõ).

## 8. Lệnh

**Legacy (nhánh `measure/baseline`, Node 14.17.1 qua `nvm-windows`):**
```powershell
nvm use 14.17.1
cd Server; npm i; npm start      # mở http://localhost:5000/view
cd Client; npm i; npm start      # Electron host
```
`Electron failed to install correctly` → xoá `node_modules\electron`, chạy `npm install electron@11`.

**Bản mới:** chưa có. Sẽ cập nhật ở PR 2.1 (dự kiến `pnpm i`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `docker compose up`).

## 9. Cấu trúc thư mục

Hiện tại:
```
Client/  Server/  app/   # code 2021 (app/ là bài Java môn khác, sẽ bị xoá)
docs/                    # tài liệu thiết kế
CLAUDE.md
```

Mục tiêu (ADR-007):
```
apps/host        # Electron
apps/viewer      # React + Vite
apps/server      # NestJS
packages/protocol   # zod schema, mã lỗi, PROTOCOL_VERSION
packages/host-core  # logic Host thuần, test được không cần Electron
packages/config     # tsconfig, eslint, vitest preset
legacy/          # code 2021, không sửa
docs/
```

## 10. Không làm

- Không merge `measure/baseline`.
- Không thêm thư viện lớn hoặc công nghệ mới mà không có ADR.
- Không áp DDD (aggregate, VO) cho Signaling, Relay, Media, Input — xem ADR-006.
- Không đưa role Controller/Observer vào JWT (04-protocol §2).
- Không phân biệt các lý do join thất bại trong phản hồi cho Viewer (luôn `401 INVALID_CREDENTIALS`).
