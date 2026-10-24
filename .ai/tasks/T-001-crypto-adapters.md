# T-001 — Adapter hạ tầng đơn giản: clock, sinh mã/OTP/id, hasher argon2

| | |
|---|---|
| Trạng thái | ready |
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
- [ ] `RandomCodeGenerator`: 10 000 lần gọi đều khớp `/^[1-9][0-9]{8}$/` và chấp nhận được bởi `SessionCode.of()`.
- [ ] `RandomOtpGenerator`: 10 000 lần gọi đều khớp `/^[0-9]{6}$/`; có test chứng minh số 0 đứng đầu được giữ nguyên (mock `randomInt` trả `123` → `"000123"`).
- [ ] Không file nào dùng `Math.random`.
- [ ] `Argon2Hasher.hash` trả chuỗi bắt đầu bằng `$argon2id$`; hash hai lần cùng một OTP ra hai chuỗi khác nhau (có salt).
- [ ] `verify` đúng → `true`; sai OTP → `false`; hash rác (`"not-a-hash"`) → `false`.
- [ ] Test của hasher dùng tham số nhỏ (ví dụ `memoryCost: 1024, timeCost: 1`) để chạy nhanh.
- [ ] `pnpm run check` xanh (gồm `dependency-cruiser`: infrastructure không bị domain/application import ngược).

## Test bắt buộc
Mỗi adapter một file `*.test.ts` cạnh file nguồn, theo quy ước `docs/06-test-strategy.md` §5 (tên test mô tả hành vi, Arrange–Act–Assert).

## Ngoài phạm vi
- `JwtTokenService`, `RedisSessionRepository`, scheduler, NestJS module — task khác.
- Sửa port, use case, domain hay tài liệu.

## Báo cáo của Gemini
_(Gemini điền sau khi làm xong.)_
