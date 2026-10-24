# ADR-004 — Mã phiên + OTP + Host duyệt + JWT ngắn hạn

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | FR-01…FR-09b, NFR-05, 02-domain-model D1/D2, 05-security S1–S4 |

## Context
Bản 2021 dùng một UUID làm room: ai biết UUID là xem và điều khiển được, UUID không đổi giữa các phiên, Host không được hỏi ý kiến. Hệ thống không có tài khoản người dùng (ngoài phạm vi v1).

## Decision
- Host nhận **Session Code 9 chữ số** và **OTP 6 chữ số** (dùng một lần, hết hạn 10 phút, lưu dạng hash argon2id).
- Viewer gửi mã + OTP; nếu đúng, OTP bị tiêu thụ ngay và **Host phải duyệt** trong 60 giây.
- Khoá phiên sau 5 lần OTP sai; rate limit theo IP.
- Danh tính khi kết nối WS là **JWT ngắn hạn** theo vai trò (`host`, `pending`, `viewer`); quyền thực tế (Controller/Observer, phiên còn sống) được kiểm tra với Redis ở mỗi lệnh.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| Link chứa UUID (như 2021) | Đơn giản | Lộ link là mất quyền; không có bước duyệt | Lỗi L11 |
| Tài khoản + đăng nhập | Định danh rõ, hỗ trợ unattended | Thêm cả một hệ thống identity | Ngoài phạm vi v1 (Q2) |
| OTP chữ + số | Không gian lớn hơn | Khó đọc qua điện thoại | Đã chọn chỉ số (Q1); bù bằng khoá phiên + Host duyệt |
| Session cookie phía server thay cho JWT | Thu hồi dễ | Cần lookup mỗi request; cookie với WS cross-origin phức tạp hơn | JWT + kiểm tra trạng thái phiên đã cho phép thu hồi tức thì |

## Consequences
- Tích cực: an toàn nhiều lớp mà không cần tài khoản; quen thuộc với người dùng (giống TeamViewer/AnyDesk); thu hồi quyền có hiệu lực ngay.
- Tiêu cực: mỗi lệnh WS cần đọc Redis (chấp nhận được, Redis nhanh); Host phải có mặt.
- Việc phải làm: chống timing attack khi mã không tồn tại; cùng một lỗi 401 cho mọi thất bại join; e2e test bảo mật (05 §5).
