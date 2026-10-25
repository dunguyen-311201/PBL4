# T-004 — Hạ tầng dev bằng Docker Compose: Redis, PostgreSQL, coturn

| | |
|---|---|
| Trạng thái | ready |
| Người làm | Gemini |
| Nhánh | `gemini/T-004` (tạo từ `master`) |
| Liên quan | `docs/01-hld.md` §3, §5 (deployment) · `docs/05-security.md` D5, §6 · `docs/03-lld/session-access.md` §9 · ADR-002, ADR-005 |

## Mục tiêu
Một lệnh dựng đủ hạ tầng cho môi trường dev: Redis (trạng thái phiên), PostgreSQL (audit), coturn (TURN cho WebRTC). Chưa chạy server NestJS trong compose (PR khác).

**Điều kiện:** cần Docker Desktop trên máy. Nếu `docker version` lỗi → **dừng, ghi vào Báo cáo**, không làm tiếp.

## Đọc trước
- `AGENTS.md`, `GEMINI.md`
- `docs/01-hld.md` §5, `docs/05-security.md` D5 và §6 (checklist deploy)
- `docs/03-lld/session-access.md` §9 (biến môi trường)

## Phạm vi (chỉ được tạo/sửa các file này)
- `docker-compose.yml` (gốc repo)
- `docker/coturn/turnserver.conf`
- `.env.example` (gốc repo)
- `docs/dev-setup.md` (mới)

## Dependency được phép thêm
- Không có (không đổi `package.json`).

## Hợp đồng

**`docker-compose.yml`** — 3 service, tất cả có `restart: unless-stopped`:

| Service | Image | Cổng ra máy | Ghi chú |
|---|---|---|---|
| `redis` | `redis:7-alpine` | `6379:6379` | `healthcheck`: `redis-cli ping` |
| `postgres` | `postgres:16-alpine` | `5432:5432` | user/pass/db lấy từ `.env`; volume có tên `pgdata`; `healthcheck`: `pg_isready` |
| `coturn` | `coturn/coturn:4.6` | `3478:3478/udp`, `3478:3478/tcp`, `49160-49200:49160-49200/udp` | mount `docker/coturn/turnserver.conf` read-only; secret truyền qua biến môi trường, **không** ghi cứng trong file conf |

**`docker/coturn/turnserver.conf`** phải có: `listening-port=3478`, `min-port=49160`, `max-port=49200`, `use-auth-secret`, `realm=pbl4.local`, `fingerprint`, `no-cli`, `no-multicast-peers`, và `denied-peer-ip` cho **tất cả** dải sau (chặn dùng TURN để vào mạng nội bộ — 05-security D5):
`0.0.0.0-0.255.255.255`, `10.0.0.0-10.255.255.255`, `100.64.0.0-100.127.255.255`, `127.0.0.0-127.255.255.255`, `169.254.0.0-169.254.255.255`, `172.16.0.0-172.31.255.255`, `192.168.0.0-192.168.255.255`, `::1`, `fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff`, `fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff`.
`static-auth-secret` truyền bằng tham số dòng lệnh từ biến môi trường `TURN_SECRET` (ví dụ `command: ["-c", "/etc/coturn/turnserver.conf", "--static-auth-secret=${TURN_SECRET}"]`).

**`.env.example`** — chỉ giá trị mẫu, **không** có secret thật:
`REDIS_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `JWT_SECRET` (ghi chú: ≥ 32 byte ngẫu nhiên, sinh bằng `openssl rand -base64 48`), `TURN_SECRET`, `TURN_URLS`, `STUN_URLS`. Mỗi biến một dòng chú thích ngắn.

**`docs/dev-setup.md`** — tiếng Việt, ngắn: yêu cầu (Node 22, pnpm, Docker Desktop), các bước `cp .env.example .env` → `docker compose up -d` → kiểm tra healthy → chạy `pnpm test:integration` với `REDIS_URL` từ compose; cách dừng/xoá dữ liệu; lưu ý cổng UDP của coturn trên Windows.

## Tiêu chí chấp nhận
- [ ] `docker compose config` chạy không lỗi.
- [ ] `docker compose up -d redis postgres` → cả hai `healthy` (dán output `docker compose ps` vào Báo cáo).
- [ ] `docker compose up -d coturn` chạy không thoát; `docker compose logs coturn` không có lỗi cấu hình (dán vài dòng đầu vào Báo cáo).
- [ ] Với `REDIS_URL=redis://localhost:6379`, `pnpm test:integration` xanh.
- [ ] `turnserver.conf` có đủ mọi dòng `denied-peer-ip` ở trên; không có secret trong bất kỳ file nào được commit.
- [ ] `.env` **không** bị commit (đã có trong `.gitignore`); `.env.example` được commit.
- [ ] `pnpm run check` xanh.

## Ngoài phạm vi
- Service NestJS, Caddy/TLS, deploy VPS.
- Sửa code, `package.json`, CI.

## Báo cáo của Gemini
_(Gemini điền sau khi làm xong.)_
