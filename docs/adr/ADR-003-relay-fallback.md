# ADR-003 — Giữ relay JPEG qua Socket.IO làm phương án dự phòng

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | FR-11, NFR-02, NFR-03, ADR-002, 05-security I2 |

## Context
WebRTC có thể không kết nối được: mạng chặn UDP, proxy doanh nghiệp kiểm tra gói tin, hoặc TURN không truy cập được. Khi đó người dùng không xem được gì.

## Decision
Nếu ICE thất bại hoặc quá 10 giây, Viewer yêu cầu `media.fallback`; Host chuyển sang gửi JPEG nhị phân (giảm độ phân giải, chất lượng ~70) qua Socket.IO với cơ chế ack: chỉ gửi frame mới khi frame trước đã được Viewer xác nhận hoặc quá 1 giây. Input đi qua `relay.input` và được server kiểm tra role.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| Chỉ dùng TURN qua TCP/TLS 443 | Không cần đường thứ hai | Vẫn có mạng chặn được; thêm cấu hình TLS cho coturn | Vẫn triển khai TURN/443 nhưng không đủ làm phương án cuối |
| Không có dự phòng | Ít code | Thất bại hoàn toàn ở một số mạng | Trải nghiệm kém, khó demo ở mạng lạ |
| Relay WebSocket không có ack | Đơn giản | Frame dồn ứ khi mạng chậm, độ trễ tăng dần | Đây chính là lỗi L9 của bản 2021 |

## Consequences
- Tích cực: hoạt động ở bất kỳ đâu HTTPS hoạt động; tái sử dụng kinh nghiệm từ bản 2021.
- Tiêu cực: server thấy frame (rủi ro chấp nhận, 05-security I2); tốn băng thông server; chất lượng thấp hơn WebRTC.
- Việc phải làm: giới hạn fps/độ phân giải ở relay; hiển thị rõ chế độ `relay` trên Viewer; đo riêng cột "v1 Relay" trong benchmark.
