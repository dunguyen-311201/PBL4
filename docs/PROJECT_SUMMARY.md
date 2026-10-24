# PBL4 Remote Desktop — Tóm tắt dự án

| | |
|---|---|
| Cập nhật | 2026-10-24 |
| Chủ dự án | Nguyen Huu Du (`dunguyen-311201`) |
| Repo | `github.com/dunguyen-311201/PBL4` (đang private) · local: `D:\projects\socket\PBL4` |
| Giai đoạn | **Thiết kế xong cho Session & Access** · Ngày 1 đang làm (đo baseline) |

Tài liệu này là điểm vào duy nhất: đọc file này trước, sau đó mới đi vào từng tài liệu chi tiết.

---

## 1. Dự án là gì

Ứng dụng điều khiển máy tính từ xa: **Host** chia sẻ màn hình bằng một ứng dụng Electron, **Viewer** xem và điều khiển chuột/bàn phím qua trình duyệt.

- **Bản 2021** (đồ án PBL4, tag `v0-legacy-2021`): Electron chụp màn hình mỗi 500ms, gửi PNG base64 qua một Socket.IO relay; trang HTML phía Viewer gửi ngược sự kiện chuột/phím, Host thực thi bằng `robotjs`.
- **Bản 2026 (redesign)**: thiết kế lại thành một sản phẩm remote desktop tối thiểu nhưng đúng và an toàn, để làm dự án portfolio cho CV và phỏng vấn (Fullstack/Backend, NestJS/React).

## 2. Kết quả review bản 2021

**14 lỗi đã ghi nhận** (chi tiết và vị trí trong code: [00-requirements §8](00-requirements.md)):

| Nhóm | Lỗi |
|---|---|
| Input | L1 phím chữ không gõ được (chỉ có keyup) · L2 tên phím trình duyệt ≠ robotjs · L3 toạ độ hard-code `*4/3` · L4 thiếu kéo thả/double-click/cuộn, chuột giữa thành chuột trái · L10 `mousemove` không throttle |
| Ổn định | L5 Viewer gắn cứng `localhost:5000` · L6 `JSON.parse` không try/catch · L7 điều kiện `&&` sai, `prompt` null gây crash · L8 listener đăng ký lặp, Stop trước Start gây crash |
| Hiệu năng | L9 PNG base64 + JSON, `setInterval` không backpressure, ~2 fps |
| Bảo mật | L11 không xác thực, UUID room cố định, Host không duyệt · L12 HTTP thuần · L13 Electron `nodeIntegration: true` |
| Mạng | L14 cần mở port public, không vượt NAT |

Vấn đề vệ sinh repo: repo private (link CV báo 404); thư mục `app/` là bài Producer–Consumer Java của môn khác, kèm file `.class`, khiến GitHub hiển thị Java 63%; README chỉ 1 dòng.

## 3. Hướng đi đã chọn

- **Viết lại, không vá** (ADR-001). Code cũ đóng băng tại tag `v0-legacy-2021`, sẽ chuyển vào `legacy/`. Lỗi cũ trở thành yêu cầu và test case.
- **Design-first**: Requirements → HLD → Domain model (DDD) → LLD → Protocol → Security → Test strategy → ADR, rồi mới implement bằng **TDD**.
- **DDD có chọn lọc**: chỉ context **Session & Access** dùng aggregate/VO/domain event; Signaling, Relay, Audit mỏng; logic client tách vào `packages/host-core` (ADR-006).

## 4. Kiến trúc mục tiêu (tóm tắt)

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Host App | Electron + TypeScript, `desktopCapturer`, `@jitsi/robotjs` | Tạo phiên, duyệt Viewer, stream màn hình, thực thi input |
| Viewer Web | React + Vite + TypeScript | Nhập mã + OTP, xem, điều khiển, overlay fps/RTT/bitrate |
| Signaling API | NestJS (REST + Socket.IO gateway), clean architecture | Vòng đời phiên, xác thực, JWT, signaling, fallback relay, rate limit |
| Redis | Redis 7 | Trạng thái phiên (TTL, optimistic concurrency bằng Lua), Socket.IO adapter, rate limit, hàng đợi deadline |
| PostgreSQL | PostgreSQL 16 | Audit log append-only |
| coturn | TURN/STUN | NAT traversal, credential tạm thời |

- **Media**: WebRTC P2P (DTLS-SRTP); input qua 2 DataChannel (`input` ordered, `input-pointer` unordered). Nếu ICE thất bại hoặc quá 10s → **fallback relay** JPEG nhị phân qua Socket.IO, có ack/backpressure (ADR-002, ADR-003).
- **Phiên**: mã 9 chữ số + OTP 6 chữ số dùng một lần + Host duyệt + JWT ngắn hạn; quyền được kiểm tra lại với Redis ở mỗi lệnh (ADR-004).
- **Monorepo** pnpm + Turborepo: `apps/{host,viewer,server}`, `packages/{protocol,host-core,config}`; `packages/protocol` (zod) là nguồn sự thật của mọi payload (ADR-007).

## 5. Quyết định đã chốt

| # | Quyết định | Ở đâu |
|---|---|---|
| Q1 | OTP là **6 chữ số**; bù bằng khoá phiên sau 5 lần sai (FR-03a) | 00-requirements §9, 05-security S1 |
| Q2 | **Không** hỗ trợ truy cập khi Host vắng mặt | FR-09b |
| Q3 | Phiên hoạt động tối đa **2 giờ**, cảnh báo trước 5 phút | FR-09a |
| D1 | OTP bị tiêu thụ ngay khi có Join Request hợp lệ (không chờ duyệt) | 02-domain-model §4.5 |
| D2 | Join Request hết hạn sau 60 giây nếu Host không phản hồi | 02-domain-model §4.5 |
| D3 | Viewer rời đi = kết thúc phiên (mất mạng được chờ 15 giây) | 02-domain-model §4.5, LLD §6.2 |
| D4 | Controller/Observer là thuộc tính của Viewer, không phải trạng thái | 02-domain-model §4.5 |
| D5 | Cảnh báo sắp hết hạn do scheduler, không phải trạng thái domain | 02-domain-model §4.5 |
| D6 | Tạo OTP mới gia hạn luôn cửa sổ chờ của phiên | 02-domain-model §4.5 |
| — | Mọi thất bại join trả cùng `401 INVALID_CREDENTIALS`; verify giả để chống timing attack | 04-protocol §3.2, LLD §5 |
| — | Token không chứa role; role kiểm tra với Redis mỗi lệnh → thu hồi tức thì | 04-protocol §2 |
| — | Vitest cho toàn monorepo | 06-test-strategy §2 |
| — | TypeScript 5.9 (không dùng 7 vì `typescript-eslint` chưa hỗ trợ); Node 22 | `.nvmrc`, `package.json` |
| ADR-001…007 | Viết lại · WebRTC · relay fallback · mã+OTP+duyệt+JWT · Redis/Postgres · clean arch + DDD chọn lọc · monorepo + protocol | [adr/](adr/README.md) |

## 6. Bản đồ tài liệu

| File | Nội dung | Trạng thái |
|---|---|---|
| [00-requirements.md](00-requirements.md) | FR/NFR có ID, ràng buộc, ngoài phạm vi, truy vết L1–L14, quyết định Q1–Q3 | v0.2 |
| [01-hld.md](01-hld.md) | C4 Context/Container, 4 sequence diagram, deployment, NFR → quyết định, rủi ro | v0.1 |
| [02-domain-model.md](02-domain-model.md) | Ubiquitous language, bounded context, aggregate `RemoteSession`, invariants I1–I9, state machine, bảng chuyển trạng thái, domain events, repository, 20 test TDD | v0.1 |
| [03-lld/session-access.md](03-lld/session-access.md) | Cây thư mục, quy tắc phụ thuộc, 9 port, 8 use case, Lua script, scheduler đa instance, cấu hình, logging, kế hoạch test | v0.1 |
| [04-protocol.md](04-protocol.md) | 3 loại token, REST, WS lệnh/sự kiện, signaling, relay, input events, DataChannel, 17 mã lỗi | v0.1 |
| [05-security.md](05-security.md) | STRIDE, phân tích số cho OTP, rủi ro chấp nhận, test bảo mật, checklist deploy | v0.1 |
| [06-test-strategy.md](06-test-strategy.md) | Kim tự tháp 8 tầng, TDD, quy ước test, ma trận truy vết, coverage, CI, checklist thủ công, DoD | v0.1 |
| [adr/](adr/README.md) | ADR-001…007 + template | Accepted |
| [ai-workflow.md](ai-workflow.md) | Phân vai Claude / Gemini, vòng task → code → review, định dạng task và review | v0.1 |
| [benchmark.md](benchmark.md) | Cách đo và bảng kết quả (chưa có số) | Trống |
| LLD signaling, media, input, host-app | Viết ngay trước Tuần 3–4 | Chưa viết |

Kế hoạch tổng thể 5 tuần: `Documents\JobHunt\Notes\PBL4_PLAN.md`.

## 7. Trạng thái hiện tại (2026-10-24)

**Đã xong**
- [x] Review code 2021 (14 lỗi).
- [x] Kế hoạch design-first 5 tuần.
- [x] Bộ tài liệu thiết kế cho Session & Access (mục 6) — đủ điều kiện bắt đầu TDD.
- [x] Tag `v0-legacy-2021` trên máy local.
- [x] Nhánh tạm `measure/baseline`: thay `robotjs` bằng `@jitsi/robotjs` để chạy được trên Node 14 không cần Visual Studio Build Tools (chỉ đổi dòng `require`, logic giữ nguyên).

- [x] PR #2 `chore/freeze-legacy` — đã merge: xoá `app/` (bản sao ở `Documents\PBL4-redesign\os-producer-consumer-java`), chuyển `Client/`, `Server/` vào `legacy/`, thêm `docs/`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `.gitignore`, `.gitattributes` (LF cho mọi file text).

**Còn lại của Ngày 1 (cần bạn làm)**
- [ ] Chạy bản cũ giữa 2 máy (nhánh `measure/baseline`) và điền cột `v0-legacy-2021` trong `benchmark.md`.
- [x] Repo đã public.
- [ ] Cập nhật link GitHub và bullet dự án trong CV, CV Context Pack.

**Tuần 2**
- [x] PR #3 (2.1) `chore/monorepo-setup` — đã merge — pnpm + Turborepo, TypeScript 5.9 strict, ESLint (typescript-eslint strict type-checked), Prettier, Vitest 4 + coverage, `dependency-cruiser` (5 luật: không vòng, domain thuần, application không phụ thuộc tầng ngoài, protocol độc lập, cấm import legacy — đã thử vi phạm và bị chặn), GitHub Actions CI, `pnpm run check` chạy giống CI.
- [x] PR #4 (2.2) `feat/protocol` — đã merge — `packages/protocol` theo TDD: 60 contract test, coverage 100%; registry lệnh kèm actor được phép gửi.

- [x] PR #5 (2.3) `feat/session-domain` — đã merge — `apps/server` với domain Session & Access theo TDD: aggregate `RemoteSession`, value objects, domain events, snapshot cho repository, test data builder. 74 test (20 mục ở 02-domain-model §8 + bảng chuyển trạng thái §4.6 dạng table-driven), coverage 100% dòng / 94.8% nhánh. Chốt thêm D6.

- [x] PR #6 (2.4) `feat/session-use-cases` — đã merge — tầng application: 9 port, 8 use case, `withRetry`, kiểm tra actor (I5), chống timing attack khi mã không tồn tại; adapter in-memory + harness cho test. Domain thêm `nextCheckAt()`. 117 test, coverage 99% dòng / 96% nhánh.

- [x] PR #7 `chore/ai-workflow` — quy trình Claude (kế hoạch, review) + Gemini/Antigravity (thực hiện): `AGENTS.md` dùng chung, `GEMINI.md`, `docs/ai-workflow.md`.
- [x] PR #8 **T-001** (Gemini, Claude review 2 vòng) — `SystemClock`, sinh mã phiên/OTP/UUID bằng `crypto`, `Argon2Hasher` (argon2id, tham số OWASP). 130 test.
- [x] PR #9 `fix/join-timing-dummy-hash` — phát hiện khi review T-001: mã không tồn tại trả lời nhanh hơn ~700 lần (0.04 ms so với 28 ms), làm lộ mã nào đang có. Sửa bằng hash giả thật do chính hasher tạo; đo lại 23.6 ms so với 23.4 ms.

**Tiếp theo**
0. T-002 (Gemini) — ICE server + credential TURN tạm thời (coturn REST API).
1. PR 2.5 (Claude, đang làm) — `RedisSessionRepository` + Lua script + `RedisDeadlineScheduler` (integration test với Testcontainers).
2. PR 2.6…2.7 — NestJS: REST + WS gateway, JWT, argon2, throttler; audit.

## 8. Lịch 5 tuần

| Thời gian | Việc | Đầu ra |
|---|---|---|
| Ngày 1 | Đóng băng legacy, baseline, public repo | Link CV hoạt động |
| Tuần 1 | Bộ tài liệu thiết kế | **Đã xong cho Session & Access** |
| Tuần 2 | Monorepo, protocol, domain + use case TDD, Redis, gateway, audit | Server có test đầy đủ |
| Tuần 3 | Electron host, input mapper, relay, viewer React | Chạy end-to-end qua relay |
| Tuần 4 | Signaling, WebRTC, DataChannel, TURN, fallback | Kiến trúc thực tế |
| Tuần 5 | Benchmark, deploy, cập nhật docs, video demo | Số liệu, demo online |

## 9. Ghi chú môi trường

- Bản legacy cần **Node 14.17.1** (dùng `nvm-windows`). `robotjs@0.6.0` gốc không có bản build sẵn cho Node 14/Windows và cần Visual Studio 2019 Build Tools; vì vậy nhánh đo dùng `@jitsi/robotjs`.
- Nếu `npm start` báo `Electron failed to install correctly`: xoá `node_modules\electron` rồi `npm install electron@11`.
- Git trên Windows có thể báo nhiều file "modified" chỉ do khác ký tự xuống dòng (CRLF/LF). Kiểm tra bằng `git diff --ignore-cr-at-eol --stat` trước khi commit; không commit những thay đổi đó.

## 10. CV & phỏng vấn

**Nguyên tắc:** chỉ ghi những gì đã làm xong; số liệu lấy từ `benchmark.md`; không từ sáo rỗng.

Bullet dùng được **ngay bây giờ** (đã có bộ thiết kế):
> **Remote Desktop Control** — University project (2021), redesign in progress · Node.js, Socket.IO, Electron
> - Reviewed the original Socket.IO relay and wrote the redesign: C4 HLD, DDD domain model for session access, LLD per module, ADRs and a STRIDE threat model.

Bullet **sau Tuần 5** (chỉ dùng khi đã làm thật) và bộ câu hỏi phỏng vấn (WebSocket, WebRTC, DDD, TDD, bảo mật, system design): xem `PBL4_PLAN.md` mục 7–8.

Câu chuyện STAR 2 phút: đồ án 2021 chạy được nhưng chậm và không an toàn → năm 2026 review như hệ thống thật → viết requirements từ lỗi đã review, thiết kế C4/DDD/LLD/ADR, implement TDD với clean architecture, WebRTC + TURN + fallback → [số liệu benchmark thật].
