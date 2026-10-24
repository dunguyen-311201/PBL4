# T-001 — Adapter hạ tầng đơn giản: clock, sinh mã/OTP/id, hasher argon2

| | |
|---|---|
| Trạng thái | in-review |
| Người làm | Gemini |
| Nhánh | `gemini/T-001` |
| Liên quan | `docs/03-lld/session-access.md` §2, §4 · `docs/05-security.md` S1, I3 · FR-01 |

## Mục tiêu
Hiện thực 5 port đã có ở tầng application bằng adapter thật, để Signaling API chạy được mà không cần fake. Đây là các adapter nhỏ, không có trạng thái.

## Đọc trước
- `AGENTS.md`, `GEMINI.md`
- `apps/server/src/session-access/application/ports/generators.ts`
- `apps/server/src/session-access/application/ports/secret-hasher.ts`
- `docs/03-lld/session-access.md` §2 (cây thư mục), §4 (ports)

## Phạm vi (chỉ được tạo/sửa các file này)
- `apps/server/src/session-access/infrastructure/system-clock.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/random-code.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/random-otp.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/uuid.generator.ts` (+ `.test.ts`)
- `apps/server/src/session-access/infrastructure/crypto/argon2.hasher.ts` (+ `.test.ts`)
- `apps/server/package.json` (chỉ thêm dependency bên dưới)
- `pnpm-lock.yaml` (do pnpm tự cập nhật)

## Dependency được phép thêm
- `argon2` (dependency của `apps/server`) — đã được chọn trong LLD/ADR-004.
- Ngoài ra **không** thêm gì. Dùng `node:crypto` cho phần ngẫu nhiên.

## Hợp đồng

| Lớp | Hiện thực port | Hành vi |
|---|---|---|
| `SystemClock` | `Clock` | `now()` trả `new Date()` |
| `RandomCodeGenerator` | `CodeGenerator` | `next()` trả chuỗi 9 chữ số, chữ số đầu 1–9, dùng `crypto.randomInt` (không dùng `Math.random`) |
| `RandomOtpGenerator` | `OtpGenerator` | `next()` trả chuỗi đúng 6 chữ số, **cho phép số 0 ở đầu** (`"000123"` hợp lệ), dùng `crypto.randomInt` |
| `UuidGenerator` | `IdGenerator` | `uuid()` trả `crypto.randomUUID()` |
| `Argon2Hasher` | `SecretHasher` | `hash(plain)` dùng **argon2id**; `verify(plain, hash)` trả `false` (không ném lỗi) khi `hash` sai định dạng; nhận tham số cấu hình `{ memoryCost, timeCost, parallelism }` qua constructor, mặc định theo khuyến nghị OWASP (memoryCost 19456 KiB, timeCost 2, parallelism 1) |

Mỗi lớp `implements` đúng port tương ứng (`import type` từ `../../application/ports/...`).

## Tiêu chí chấp nhận
- [x] `RandomCodeGenerator`: 10 000 lần gọi đều khớp `/^[1-9][0-9]{8}$/` và chấp nhận được bởi `SessionCode.of()`.
- [x] `RandomOtpGenerator`: 10 000 lần gọi đều khớp `/^[0-9]{6}$/`; có test chứng minh số 0 đứng đầu được giữ nguyên (mock `randomInt` trả `123` → `"000123"`).
- [x] Không file nào dùng `Math.random`.
- [x] `Argon2Hasher.hash` trả chuỗi bắt đầu bằng `$argon2id$`; hash hai lần cùng một OTP ra hai chuỗi khác nhau (có salt).
- [x] `verify` đúng → `true`; sai OTP → `false`; hash rác (`"not-a-hash"`) → `false`.
- [x] Test của hasher dùng tham số nhỏ (ví dụ `memoryCost: 1024, timeCost: 1`) để chạy nhanh.
- [x] `pnpm run check` xanh (gồm `dependency-cruiser`: infrastructure không bị domain/application import ngược).

## Test bắt buộc
Mỗi adapter một file `*.test.ts` cạnh file nguồn, theo quy ước `docs/06-test-strategy.md` §5 (tên test mô tả hành vi, Arrange–Act–Assert).

## Ngoài phạm vi
- `JwtTokenService`, `RedisSessionRepository`, scheduler, NestJS module — task khác.
- Sửa port, use case, domain hay tài liệu.

## Báo cáo của Gemini

### Đã làm
1. Cài đặt dependency `argon2` (^0.45.1) vào `apps/server`.
2. Tạo 5 adapter hạ tầng cùng unit test tương ứng theo đúng hợp đồng các port:
   - `SystemClock` (`system-clock.ts`, `system-clock.test.ts`): hiện thực port `Clock`, trả `new Date()`.
   - `RandomCodeGenerator` (`random-code.generator.ts`, `random-code.generator.test.ts`): hiện thực port `CodeGenerator`, sinh mã 9 chữ số (chữ số đầu 1–9) dùng `crypto.randomInt`, chấp nhận bởi `SessionCode.of()`.
   - `RandomOtpGenerator` (`random-otp.generator.ts`, `random-otp.generator.test.ts`): hiện thực port `OtpGenerator`, sinh OTP 6 chữ số (giữ số 0 ở đầu bằng `padStart(6, '0')`) dùng `crypto.randomInt`.
   - `UuidGenerator` (`uuid.generator.ts`, `uuid.generator.test.ts`): hiện thực port `IdGenerator`, sinh UUID v4 bằng `crypto.randomUUID()`.
   - `Argon2Hasher` (`argon2.hasher.ts`, `argon2.hasher.test.ts`): hiện thực port `SecretHasher`, hash bằng argon2id (OWASP defaults: memoryCost 19456 KiB, timeCost 2, parallelism 1), verify an toàn không ném exception khi hash sai định dạng.
3. Quy trình TDD chặt chẽ: viết test trước (Red) -> hiện thực code tối thiểu (Green) -> format & typecheck.

### File đã tạo / sửa
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

### Lệnh đã chạy
- `pnpm --filter @pbl4/server add argon2`
- `pnpm --filter @pbl4/server test`
- `pnpm format`
- `pnpm lint`
- `pnpm --filter @pbl4/server typecheck`
- `pnpm run check` (tất cả các bước format, lint, typecheck, depcruise, test:coverage đều xanh 100%)

### Điều chưa chắc chắn
- Không có. Toàn bộ tiêu chí nghiệm thu đều đạt và có test chứng minh.
