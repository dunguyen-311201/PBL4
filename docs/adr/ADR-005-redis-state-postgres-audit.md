# ADR-005 — Redis cho trạng thái phiên, PostgreSQL chỉ cho audit

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | NFR-07, FR-30, 02-domain-model §5–6, 03-lld/session-access §7–8 |

## Context
Phiên sống ngắn (≤ 2h10m), cần TTL, đọc ở mỗi lệnh WS, và phải nhất quán khi chạy nhiều instance server. Socket.IO nhiều instance cần một kênh chia sẻ để emit tới room. Audit cần lưu lâu dài và truy vấn được.

## Decision
- **Redis** lưu aggregate `RemoteSession` (JSON + `version`), ánh xạ mã → phiên, hàng đợi mốc thời gian (sorted set), bộ đếm rate limit, và làm **Socket.IO Redis adapter**. Ghi bằng Lua script có kiểm tra version (optimistic concurrency).
- **PostgreSQL** chỉ lưu audit log dạng append-only, được ghi bởi subscriber của domain event.
- Event được publish trong process (`EventEmitter2`) **sau khi** lưu Redis thành công.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| PostgreSQL cho cả trạng thái phiên (row lock) | Một nguồn dữ liệu, có transaction | Không có TTL tự nhiên; tải ghi/đọc nhiều cho dữ liệu ngắn hạn; vẫn cần Redis cho adapter | Thêm phức tạp không cần thiết |
| Bộ nhớ trong process + sticky session | Nhanh, đơn giản | Mất trạng thái khi restart; không chạy nhiều instance an toàn | Vi phạm NFR-07 |
| Redis lock (Redlock) thay cho optimistic concurrency | Quen thuộc | Lock có thời hạn, dễ sai khi GC pause; xung đột thực tế rất hiếm | Optimistic đơn giản và đủ |
| Outbox pattern cho event | Không mất event | Cần bảng outbox + worker | Hoãn: chấp nhận rủi ro mất event audit trong v1 |

## Consequences
- Tích cực: TTL và nguyên tử có sẵn; scale ngang chỉ cần thêm instance; tách rõ dữ liệu nóng (Redis) và lịch sử (Postgres).
- Tiêu cực: Redis là điểm phụ thuộc chính (mất Redis = mất mọi phiên đang chạy, chấp nhận cho v1); hai kho dữ liệu cần vận hành.
- Việc phải làm: integration test cho Lua script và scheduler giành quyền bằng `ZREM`; ghi nhận outbox trong "What I'd do next".
