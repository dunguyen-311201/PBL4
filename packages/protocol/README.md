# @pbl4/protocol

Hợp đồng giao tiếp dùng chung giữa Host App, Viewer Web và Signaling API — **nguồn sự thật** cho mọi payload đi qua mạng (ADR-007). `docs/04-protocol.md` mô tả lại; nếu lệch nhau, code ở đây thắng và tài liệu phải được sửa trong cùng PR.

| File | Nội dung |
|---|---|
| `version.ts` | `PROTOCOL_VERSION`, schema handshake WebSocket |
| `errors.ts` | 17 mã lỗi và HTTP status tương ứng |
| `ack.ts` | Kiểu `Ack<T>` cho mọi lệnh có phản hồi, `ackOk` / `ackFail` |
| `rest/sessions.ts` | `POST /v1/sessions`, `POST /v1/sessions/join` |
| `ws/host-commands.ts` | Lệnh của Host: duyệt, từ chối, đổi role, kết thúc |
| `ws/signaling.ts` | `rtc.offer/answer/ice`, `media.fallback`, `media.mode` |
| `ws/relay.ts` | Metadata frame JPEG và ack của fallback relay |
| `ws/server-events.ts` | Sự kiện server đẩy xuống client |
| `ws/events.ts` | Registry tên sự kiện → schema, và actor được phép gửi từng lệnh |
| `input.ts` | Input chuột/phím (toạ độ chuẩn hoá 0..1), tên DataChannel |

```ts
import { JoinRequestBody, CLIENT_COMMANDS } from '@pbl4/protocol';

const body = JoinRequestBody.parse(req.body);                 // REST
const { schema, actors } = CLIENT_COMMANDS['join.approve'];   // WS guard + pipe
```

Lệnh: `pnpm --filter @pbl4/protocol test` · `test:coverage` · `build`.
