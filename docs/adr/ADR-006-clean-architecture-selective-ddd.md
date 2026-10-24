# ADR-006 — Clean architecture, DDD chỉ áp dụng ở Session & Access

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | NFR-09, 02-domain-model §1, 03-lld/session-access §2–3, 06-test-strategy §3 |

## Context
Hệ thống có một phần chứa luật nghiệp vụ thật (vòng đời phiên, OTP, duyệt, role, hết hạn) và nhiều phần thuần kỹ thuật (chuyển tiếp signaling, chuyển frame, ánh xạ phím). Áp một khuôn kiến trúc nặng cho mọi nơi sẽ tạo nhiều lớp trung gian không mang lại giá trị.

## Decision
- **Session & Access**: clean/hexagonal architecture đầy đủ (domain → application → infrastructure/presentation) và DDD chiến thuật (aggregate `RemoteSession`, value objects, domain events, repository port).
- **Signaling, Relay**: application service mỏng gọi `SessionAccessQuery`; không có domain model riêng.
- **Audit**: subscriber ghi event.
- **Phía client (Host/Viewer)**: logic thuần tách ra `packages/host-core` để test được; không dùng DDD.
- Quy tắc phụ thuộc được kiểm tra tự động bằng `dependency-cruiser` trong CI.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| NestJS "service + repository" thông thường | Ít file, quen thuộc | Luật nghiệp vụ rải trong service và controller; khó test thuần; dễ vi phạm invariant | Session & Access có đủ luật để cần aggregate |
| DDD + clean architecture cho mọi module | Đồng nhất | Nhiều lớp rỗng cho các module chỉ chuyển tiếp dữ liệu | Over-engineering |

## Consequences
- Tích cực: luật nghiệp vụ tập trung một chỗ, test nhanh và không cần I/O; các module kỹ thuật vẫn gọn.
- Tiêu cực: hai phong cách trong cùng codebase — cần README của `apps/server` giải thích rõ module nào theo khuôn nào.
- Việc phải làm: rule `dependency-cruiser`; test data builder cho aggregate.
