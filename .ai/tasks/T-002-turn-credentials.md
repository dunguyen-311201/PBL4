# T-002 — Danh sách ICE server và credential TURN tạm thời

| | |
|---|---|
| Trạng thái | in-review |
| Người làm | Gemini |
| Nhánh | `gemini/T-002` (tạo từ `master`) |
| Liên quan | `docs/04-protocol.md` §4.4 (`join.approved.iceServers`) · `docs/05-security.md` D5 · ADR-002 · `docs/03-lld/session-access.md` §2, §9 |

## Mục tiêu
Khi Host duyệt Viewer, server gửi kèm danh sách ICE server để hai bên thiết lập WebRTC. TURN dùng **credential tạm thời** theo chuẩn "TURN REST API" của coturn (`use-auth-secret`), hết hạn cùng phiên, để không ai dùng TURN của hệ thống như proxy miễn phí.

## Đọc trước
- `AGENTS.md`, `GEMINI.md`
- `docs/04-protocol.md` §4.4 — `iceServers: RTCIceServer[]`
- `packages/protocol/src/ws/server-events.ts` — schema `IceServer` (để hiểu hình dạng dữ liệu; **không** import package này)

## Phạm vi (chỉ được tạo/sửa các file này)
- `apps/server/src/session-access/application/ports/ice-server-provider.ts` — tạo đúng như mục Hợp đồng
- `apps/server/src/session-access/application/ports/index.ts` — thêm một dòng export
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts` (+ `.test.ts`)

## Dependency được phép thêm
- Không có. Dùng `node:crypto` (`createHmac`).

## Hợp đồng

Port (tạo nguyên văn):
```ts
// apps/server/src/session-access/application/ports/ice-server-provider.ts
export interface IceServer {
  readonly urls: string | readonly string[];
  readonly username?: string;
  readonly credential?: string;
}

/** ICE servers handed to an approved viewer and to the host (ADR-002). */
export interface IceServerProvider {
  forSession(sessionId: string, expiresAt: Date): IceServer[];
}
```

Adapter:
```ts
export interface TurnConfig {
  readonly stunUrls: readonly string[];   // ví dụ ['stun:stun.l.google.com:19302']
  readonly turnUrls: readonly string[];   // ví dụ ['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:443?transport=tcp']
  readonly turnSecret: string;            // = static-auth-secret của coturn
}
export class TurnIceServerProvider implements IceServerProvider { constructor(config: TurnConfig) }
```

Hành vi của `forSession(sessionId, expiresAt)`:
1. Nếu `stunUrls` không rỗng → một phần tử `{ urls: stunUrls }` (không có username/credential).
2. Nếu `turnUrls` không rỗng → một phần tử `{ urls: turnUrls, username, credential }` với:
   - `username = "<expiresAt tính bằng giây Unix, làm tròn xuống>:<sessionId>"`
   - `credential = base64( HMAC-SHA1( turnSecret, username ) )`
3. Thứ tự: STUN trước, TURN sau. Danh sách rỗng thì bỏ phần tử tương ứng.

Constructor ném `Error` nếu `turnUrls` không rỗng mà `turnSecret` rỗng, hoặc nếu có URL không bắt đầu bằng `stun:`, `turn:` hay `turns:` (đúng loại cho từng danh sách: `stunUrls` chỉ `stun:`; `turnUrls` chỉ `turn:`/`turns:`).

## Tiêu chí chấp nhận
- [x] **Test vector** (bắt buộc khớp chính xác): `turnSecret = "s3cret-turn-key"`, `sessionId = "5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b"`, `expiresAt = 2026-10-24T12:00:00.000Z` → `username = "1792843200:5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b"`, `credential = "8jApRNGz7QzNfABPvnYe/VCOgqU="`.
- [x] `expiresAt = 2026-10-24T12:00:00.900Z` cho cùng `username` như trên (làm tròn xuống).
- [x] Chỉ có STUN → đúng một phần tử, không có `username`/`credential`.
- [x] Chỉ có TURN → đúng một phần tử có `username` và `credential`.
- [x] Cả hai rỗng → `[]`.
- [x] Constructor ném lỗi cho: TURN có URL nhưng secret rỗng; `stunUrls` chứa URL `turn:`; `turnUrls` chứa URL `http:`.
- [x] Không log và không đưa `turnSecret` vào bất kỳ giá trị trả về nào (test: `JSON.stringify(kết quả)` không chứa secret).
- [x] `pnpm run check` xanh.

## Test bắt buộc
`turn-ice-server.provider.test.ts` theo `docs/06-test-strategy.md` §5; dùng `afterEach(() => { vi.restoreAllMocks(); })` nếu có mock.

## Ngoài phạm vi
- Đọc biến môi trường `TURN_URLS`/`TURN_SECRET` (làm ở PR NestJS).
- Gọi provider từ `ApproveJoin` hay gateway; cấu hình coturn; docker-compose.
- Sửa use case, domain, protocol, tài liệu.

## Báo cáo của Gemini

### Đã làm
1. Tạo port `IceServerProvider` và interface `IceServer` tại `apps/server/src/session-access/application/ports/ice-server-provider.ts` theo đúng hợp đồng.
2. Re-export `ice-server-provider.js` trong `apps/server/src/session-access/application/ports/index.ts`.
3. Viết unit test theo TDD trong `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.test.ts` bao phủ 11 test cases:
   - Khớp chính xác test vector (username dạng `<unixSeconds>:<sessionId>` và credential HMAC-SHA1 base64).
   - Làm tròn xuống Unix seconds khi `expiresAt` có phần lẻ mili-giây.
   - Trả về STUN only, TURN only, cả hai (đúng thứ tự STUN trước, TURN sau), hoặc mảng rỗng `[]` khi cả hai rỗng.
   - Kiểm tra validate URL và secret trong constructor (ném `Error` khi URL sai scheme hoặc thiếu secret).
   - Đảm bảo `turnSecret` không bị lọt vào giá trị trả về hay chuỗi JSON.
   - Sử dụng `afterEach(() => { vi.restoreAllMocks(); })`.
4. Hiện thực adapter `TurnIceServerProvider` tại `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts`.
5. Format code bằng prettier và kiểm tra toàn bộ suite `pnpm run check` đạt 100% xanh.

### File đã tạo / sửa
- `apps/server/src/session-access/application/ports/ice-server-provider.ts`
- `apps/server/src/session-access/application/ports/index.ts`
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.ts`
- `apps/server/src/session-access/infrastructure/turn/turn-ice-server.provider.test.ts`
- `.ai/tasks/T-002-turn-credentials.md`

### Lệnh đã chạy
- `pnpm --filter @pbl4/server test turn-ice-server.provider.test.ts`
- `pnpm format`
- `pnpm run check`

### Điều chưa chắc chắn
- Không có. Toàn bộ tiêu chí nghiệm thu đều đạt và có test chứng minh.
