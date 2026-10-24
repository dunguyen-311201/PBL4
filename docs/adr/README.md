# Architecture Decision Records

| ADR | Quyết định | Trạng thái |
|---|---|---|
| [ADR-001](ADR-001-rewrite-instead-of-patch.md) | Viết lại hệ thống thay vì vá bản 2021 | Accepted |
| [ADR-002](ADR-002-webrtc-for-media.md) | WebRTC cho hình ảnh và input, Socket.IO chỉ làm signaling | Accepted |
| [ADR-003](ADR-003-relay-fallback.md) | Giữ relay JPEG qua Socket.IO làm phương án dự phòng | Accepted |
| [ADR-004](ADR-004-session-code-otp-approval.md) | Mã phiên + OTP + Host duyệt + JWT ngắn hạn | Accepted |
| [ADR-005](ADR-005-redis-state-postgres-audit.md) | Redis cho trạng thái phiên, PostgreSQL chỉ cho audit | Accepted |
| [ADR-006](ADR-006-clean-architecture-selective-ddd.md) | Clean architecture, DDD chỉ ở Session & Access | Accepted |
| [ADR-007](ADR-007-monorepo-shared-protocol.md) | Monorepo pnpm + Turborepo với package `protocol` dùng chung | Accepted |

Mẫu: [0000-template.md](0000-template.md). Khi đổi một quyết định, không sửa ADR cũ — tạo ADR mới và đánh dấu ADR cũ là `Superseded by ADR-XXX`.
