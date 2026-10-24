# ADR-001 — Viết lại hệ thống thay vì vá bản 2021

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | [00-requirements.md §8](../00-requirements.md), ADR-002, ADR-004, ADR-006 |

## Context
Bản 2021 có 14 lỗi đã ghi nhận (L1–L14), trong đó nhiều lỗi nằm ở chính mô hình chứ không phải chi tiết code:
- room là một UUID cố định, không có xác thực hay bước duyệt của Host;
- toàn bộ hình ảnh đi qua server dưới dạng PNG base64, không có backpressure;
- server phải mở port public, không vượt được NAT;
- Electron chạy với `nodeIntegration: true`.

Mục tiêu mới (WebRTC, phiên có xác thực, chạy nhiều instance, TDD) thay đổi gần như mọi thành phần.

## Decision
Đóng băng bản 2021 tại tag `v0-legacy-2021` (thư mục `legacy/`), không sửa thêm. Xây hệ thống mới trong monorepo TypeScript theo thiết kế ở `docs/`. Các lỗi của bản cũ trở thành yêu cầu và test case của bản mới.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| Vá dần bản 2021 | Có kết quả chạy được sớm | Phần lớn code vá sẽ bị thay khi chuyển WebRTC và thêm xác thực; JS thuần, không test, khó áp dụng TDD | Công sức không tái sử dụng được |
| Vá tối thiểu rồi mới viết lại | Có demo tạm | Tốn 1 tuần cho code sẽ bỏ đi | Đã có bộ thiết kế để trình bày khi phỏng vấn trong thời gian chờ |

## Consequences
- Tích cực: thiết kế sạch từ đầu; mọi phần đều có test; lịch sử repo cho thấy rõ quá trình từ bản cũ sang bản mới.
- Tiêu cực: khoảng 2 tuần đầu chưa có bản chạy được mới; bản legacy vẫn còn lỗi.
- Việc phải làm theo: README ghi rõ trạng thái "redesign in progress"; đo baseline bản legacy trước khi đóng băng để có số so sánh.
