# 04 — Protocol (REST · WebSocket · DataChannel)

| | |
|---|---|
| Trạng thái | Draft v0.1 |
| Cập nhật | 2026-10-23 |
| Phiên bản protocol | `1` |
| Liên quan | [01-hld.md §4](01-hld.md) · [02-domain-model.md](02-domain-model.md) · [03-lld/session-access.md](03-lld/session-access.md) |

**Nguồn sự thật:** package `packages/protocol` (zod schema). Tài liệu này mô tả lại schema đó; nếu lệch nhau, code thắng và tài liệu phải được sửa trong cùng PR.

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Base URL | `https://<host>/v1` · WebSocket: `wss://<host>/session` (Socket.IO namespace `/session`) |
| Định dạng | JSON UTF-8; thời gian dạng ISO-8601 UTC; id dạng UUID v4 |
| Tên sự kiện WS | `<đối tượng>.<hành động>` viết thường, ví dụ `join.approve` |
| Lệnh có phản hồi | Client gửi kèm ack callback; server luôn trả `{ ok: true, data? }` hoặc `{ ok: false, error }` |
| Lỗi | `{ code: string, message: string }` — `code` ổn định (§7), `message` chỉ để debug |
| Giới hạn payload | 1 MB (`maxHttpBufferSize`); vượt quá → ngắt kết nối với `PAYLOAD_TOO_LARGE` |
| Version | Handshake WS gửi `auth.protocolVersion = "1"`; khác version → `connect_error` với `PROTOCOL_VERSION_UNSUPPORTED` |

## 2. Token

| Token | Cấp khi | Claims | Dùng để | Thời hạn |
|---|---|---|---|---|
| `hostToken` | `POST /sessions` | `sub=sessionId`, `kind=host` | Kết nối WS với vai trò Host | Đến hết vòng đời tối đa của phiên (WAITING_TTL + 2h) |
| `pendingToken` | `POST /sessions/join` thành công | `sub=sessionId`, `kind=pending`, `jrid=joinRequestId` | Kết nối WS để chờ quyết định của Host | 60 giây (= APPROVAL_TIMEOUT) |
| `viewerToken` | Host duyệt (đẩy qua WS) | `sub=sessionId`, `kind=viewer`, `vid=viewerId` | Kết nối WS với vai trò Viewer | Đến `activeExpiresAt` |

- JWT ký HS256 bằng secret trong biến môi trường; client giữ token **trong bộ nhớ**, không ghi localStorage.
- Token không chứa role Controller/Observer. Mỗi lệnh đều được kiểm tra lại với trạng thái phiên trong Redis, nên khi Host đổi role hoặc kết thúc phiên, hiệu lực là **ngay lập tức** mà không cần thu hồi token.

## 3. REST API

### 3.1 `POST /v1/sessions` — Host tạo phiên (FR-01)

Request: không có body.

`201 Created`
```json
{
  "sessionId": "5b0c…",
  "code": "482915307",
  "otp": "093184",
  "otpExpiresAt": "2026-10-24T03:10:00Z",
  "waitingExpiresAt": "2026-10-24T03:10:00Z",
  "hostToken": "eyJ…"
}
```
Lỗi: `429 RATE_LIMITED`, `503 CODE_SPACE_EXHAUSTED` (không sinh được mã duy nhất sau N lần thử).

### 3.2 `POST /v1/sessions/join` — Viewer xin tham gia (FR-03)

```json
{ "code": "482915307", "otp": "093184" }
```

`202 Accepted`
```json
{
  "joinRequestId": "c1d2…",
  "pendingToken": "eyJ…",
  "decisionDeadline": "2026-10-24T03:01:00Z"
}
```

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `INVALID_INPUT` | Sai định dạng (không phải 9 số / 6 số) |
| 401 | `INVALID_CREDENTIALS` | Mã không tồn tại, OTP sai, OTP đã dùng/hết hạn, phiên bị khoá, phiên đang bận |
| 429 | `RATE_LIMITED` | Quá 5 lần/IP/phút; kèm header `Retry-After` |

> Mọi thất bại xác thực đều trả **cùng một** `401 INVALID_CREDENTIALS`, để người dò mã không phân biệt được "mã không tồn tại" với "OTP sai" hay "phiên bị khoá". Host vẫn nhận thông tin chi tiết qua WS (`session.locked`).

### 3.3 `GET /v1/health`
`200 { "status": "ok", "redis": "ok" }` — dùng cho load balancer và docker healthcheck.

## 4. WebSocket — namespace `/session`

### 4.1 Kết nối

```ts
io("wss://<host>/session", {
  auth: { token: "<hostToken | pendingToken | viewerToken>", protocolVersion: "1" },
  transports: ["websocket"],
});
```

Server xác thực trong middleware handshake, gắn `principal = { kind, sessionId, viewerId?, joinRequestId? }` vào socket và cho vào room:

| kind | Room |
|---|---|
| host | `s:{sessionId}:host` |
| pending | `jr:{joinRequestId}` |
| viewer | `s:{sessionId}:viewer` |

Lỗi `connect_error.data.code`: `UNAUTHORIZED`, `PROTOCOL_VERSION_UNSUPPORTED`, `SESSION_CLOSED`.
Mỗi phiên chỉ giữ **một socket Host và một socket Viewer**; socket mới cùng vai trò sẽ thay socket cũ (socket cũ nhận `session.replaced` rồi bị ngắt).

### 4.2 Lệnh của Host (client → server, có ack)

| Sự kiện | Payload | `data` khi ok | Lỗi | FR |
|---|---|---|---|---|
| `session.otp.regenerate` | `{}` | `{ otp, otpExpiresAt }` | `JOIN_ALREADY_PENDING`, `SESSION_OCCUPIED`, `SESSION_CLOSED` | FR-02, FR-03a |
| `join.approve` | `{ joinRequestId, role: "controller" \| "observer" }` | `{ viewerId, activeExpiresAt }` | `NO_PENDING_JOIN`, `JOIN_REQUEST_EXPIRED`, `SESSION_CLOSED` | FR-04, FR-05 |
| `join.reject` | `{ joinRequestId }` | `{}` | `NO_PENDING_JOIN`, `SESSION_CLOSED` | FR-04 |
| `viewer.role.change` | `{ role }` | `{ role }` | `NO_VIEWER`, `SESSION_CLOSED` | FR-06, FR-24 |
| `session.terminate` | `{ reason?: string }` | `{}` | `SESSION_CLOSED` | FR-07 |

### 4.3 Lệnh của Viewer (client → server, có ack)

| Sự kiện | Payload | Lỗi | FR |
|---|---|---|---|
| `session.terminate` | `{ reason?: string }` | `SESSION_CLOSED` | FR-07 |

Socket `pending` không gửi lệnh nào, chỉ chờ sự kiện ở §4.4.

### 4.4 Sự kiện server → client

| Sự kiện | Gửi tới | Payload |
|---|---|---|
| `join.requested` | host | `{ joinRequestId, viewerIp, decisionDeadline }` |
| `join.approved` | pending | `{ viewerToken, viewerId, role, activeExpiresAt, iceServers: RTCIceServer[] }` |
| `join.rejected` | pending | `{ reason: "rejected" \| "timeout" }` |
| `session.locked` | host | `{ failedAttempts }` |
| `viewer.connected` / `viewer.disconnected` | host | `{ viewerId }` |
| `viewer.role.changed` | viewer | `{ role }` |
| `session.expiring` | host, viewer | `{ expiresAt }` (5 phút trước hạn) |
| `session.terminated` | host, viewer | `{ by: "host" \| "viewer", reason? }` |
| `session.expired` | host, viewer, pending | `{}` |
| `session.replaced` | socket cũ | `{}` |

`iceServers` gồm STUN công khai và TURN của hệ thống với credential tạm thời (HMAC theo chuẩn coturn REST API, hạn bằng `activeExpiresAt`).

### 4.5 Signaling WebRTC (chỉ khi phiên `Active`)

| Sự kiện | Hướng | Payload |
|---|---|---|
| `rtc.offer` | host → server → viewer | `{ sdp: string }` |
| `rtc.answer` | viewer → server → host | `{ sdp: string }` |
| `rtc.ice` | hai chiều | `{ candidate: RTCIceCandidateInit \| null }` (`null` = end-of-candidates) |
| `media.fallback` | viewer → server → host | `{ reason: "ice_failed" \| "timeout" \| "manual" }` |
| `media.mode` | host → server → viewer | `{ mode: "webrtc" \| "relay" }` |

Server chỉ chuyển tiếp, không đọc SDP; giới hạn `sdp` ≤ 64 KB. Gửi khi phiên không `Active` → ack `SESSION_NOT_ACTIVE`.

### 4.6 Fallback Relay

| Sự kiện | Hướng | Payload | Ghi chú |
|---|---|---|---|
| `relay.frame` | host → server → viewer | `(meta: { seq, width, height, ts }, jpeg: Buffer)` | Binary attachment của Socket.IO |
| `relay.frame.ack` | viewer → server → host | `{ seq }` | Host chỉ gửi frame mới sau khi nhận ack frame trước, hoặc sau 1 giây timeout (bỏ qua frame đó) |
| `relay.input` | viewer → server → host | `InputEvent` (§5) | Server từ chối nếu Viewer là Observer → `FORBIDDEN` |

## 5. Input events (dùng chung cho DataChannel và `relay.input`)

```ts
type Button = "left" | "middle" | "right";
type Modifiers = { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };

type InputEvent =
  | { t: "pm"; x: number; y: number }                          // pointer move, x,y ∈ [0,1]
  | { t: "pd"; b: Button; x: number; y: number }               // pointer down
  | { t: "pu"; b: Button; x: number; y: number }               // pointer up
  | { t: "dc"; b: Button; x: number; y: number }               // double click
  | { t: "wh"; dx: number; dy: number }                        // wheel (pixel delta, đã giới hạn ±1200)
  | { t: "kd"; key: string; code: string; mods: Modifiers }    // key down
  | { t: "ku"; key: string; code: string; mods: Modifiers };   // key up
```

- Toạ độ luôn **chuẩn hoá 0..1** theo khung hình đang hiển thị; Host tự quy đổi theo độ phân giải và DPI thật (FR-22).
- Gửi cả `key` (ký tự logic) và `code` (phím vật lý); Host ưu tiên `code` cho phím điều khiển và `key` cho ký tự, bảng ánh xạ nằm trong LLD input-control.
- Tên trường ngắn vì `pm` có thể gửi ~60 lần/giây.

### 5.1 RTCDataChannel

| Kênh | Cấu hình | Mang sự kiện |
|---|---|---|
| `input` | `ordered: true`, reliable | `pd`, `pu`, `dc`, `wh`, `kd`, `ku` |
| `input-pointer` | `ordered: false`, `maxRetransmits: 0` | `pm` (mất gói thì bỏ, chỉ vị trí mới nhất có ý nghĩa) |

Host bỏ qua mọi sự kiện trên DataChannel khi role hiện tại là Observer (Host nhận role mới qua `viewer.role.changed` gửi song song cho cả Host) — server không đứng giữa DataChannel nên Host là nơi chặn.

## 6. Ví dụ schema zod (trong `packages/protocol`)

```ts
export const PROTOCOL_VERSION = "1" as const;

export const JoinRequestBody = z.object({
  code: z.string().regex(/^[1-9][0-9]{8}$/),
  otp: z.string().regex(/^[0-9]{6}$/),
});

export const JoinApprovePayload = z.object({
  joinRequestId: z.string().uuid(),
  role: z.enum(["controller", "observer"]),
});

const unit = z.number().min(0).max(1);
export const InputEvent = z.discriminatedUnion("t", [
  z.object({ t: z.literal("pm"), x: unit, y: unit }),
  // … các biến thể còn lại như §5
]);

export type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
```

## 7. Mã lỗi

| `code` | HTTP | Nghĩa | Nguồn domain error |
|---|---|---|---|
| `INVALID_INPUT` | 400 | Payload sai schema | (validation) |
| `INVALID_CREDENTIALS` | 401 | Join thất bại (mọi lý do) | `OtpMismatch`, `OtpExpired`, `OtpConsumed`, `SessionLocked`, `SessionOccupied`, `JoinAlreadyPending`, không tìm thấy mã |
| `UNAUTHORIZED` | 401 | Token thiếu/sai/hết hạn | (auth) |
| `FORBIDDEN` | 403 | Đúng phiên nhưng sai vai trò (Viewer gọi lệnh Host, Observer gửi input) | (guard) |
| `RATE_LIMITED` | 429 | Vượt rate limit | (throttler) |
| `NO_PENDING_JOIN` | 409 | Không có Join Request khớp | `NoPendingJoin` |
| `JOIN_REQUEST_EXPIRED` | 409 | Quá 60 giây | `JoinRequestExpired` |
| `JOIN_ALREADY_PENDING` | 409 | (phía Host) đang có Join Request chờ | `JoinAlreadyPending` |
| `SESSION_OCCUPIED` | 409 | (phía Host) phiên đã có Viewer | `SessionOccupied` |
| `NO_VIEWER` | 409 | Chưa có Viewer | `NoViewer` |
| `SESSION_NOT_ACTIVE` | 409 | Signaling/relay khi phiên chưa `Active` | (query) |
| `SESSION_CLOSED` | 410 | Phiên đã kết thúc/hết hạn | `SessionClosed` |
| `CONFLICT` | 409 | Xung đột đồng thời sau khi đã thử lại | `ConcurrencyConflict` |
| `PAYLOAD_TOO_LARGE` | 413 | Vượt giới hạn kích thước | (transport) |
| `PROTOCOL_VERSION_UNSUPPORTED` | — | Sai `protocolVersion` | (handshake) |
| `CODE_SPACE_EXHAUSTED` | 503 | Không sinh được mã duy nhất | (application) |
| `INTERNAL` | 500 | Lỗi không mong muốn (đã log kèm `requestId`) | — |

## 8. Hợp đồng được kiểm thử thế nào

- **Contract test** trong `packages/protocol`: mỗi schema có mẫu hợp lệ và không hợp lệ.
- Server validate mọi payload vào bằng schema (pipe/guard); client validate mọi payload nhận về ở chế độ dev.
- E2E test của gateway dùng chính type từ `packages/protocol`, nên đổi schema mà quên sửa một bên sẽ lỗi typecheck.
