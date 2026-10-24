# ADR-002 — WebRTC cho hình ảnh và input, Socket.IO chỉ làm signaling

| | |
|---|---|
| Trạng thái | Accepted |
| Ngày | 2026-10-23 |
| Liên quan | FR-10, FR-20, FR-21, NFR-01…04, ADR-003 |

## Context
Bản 2021 gửi ảnh PNG base64 qua Socket.IO mỗi 500ms, đạt khoảng 2 fps và toàn bộ hình ảnh đi qua server. Mục tiêu mới là độ trễ input p95 < 150ms trong LAN, ≥ 15 fps, và hình ảnh được mã hoá khi truyền.

## Decision
- Hình ảnh: Electron `desktopCapturer` → MediaStream → `RTCPeerConnection`, peer-to-peer khi có thể, qua TURN khi không.
- Input: hai `RTCDataChannel` — `input` (ordered, reliable) và `input-pointer` (unordered, `maxRetransmits: 0`).
- Socket.IO chỉ dùng cho quản lý phiên, signaling (offer/answer/ICE) và chế độ fallback.

## Alternatives
| Phương án | Ưu | Nhược | Lý do loại |
|---|---|---|---|
| Giữ ảnh JPEG qua WebSocket (cải tiến) | Đơn giản, đi qua mọi proxy | Không có nén liên khung, TCP gây head-of-line blocking, mọi frame qua server | Không đạt NFR-01/02, tốn băng thông server — giữ lại làm fallback (ADR-003) |
| WebCodecs (H.264) + gửi qua WebSocket | Nén tốt, kiểm soát được encoder | Phải tự làm congestion control, jitter buffer; vẫn qua server, vẫn TCP | Tự làm lại phần WebRTC đã có sẵn |
| SFU (mediasoup, LiveKit) | Mở rộng nhiều người xem | Thêm một thành phần nặng cho bài toán 1–1 | Ngoài phạm vi (1 Viewer/phiên) |

## Consequences
- Tích cực: codec video với nén liên khung, UDP, congestion control và DTLS-SRTP có sẵn; server không phải chuyển hình ảnh trong trường hợp thường gặp.
- Tiêu cực: cần STUN/TURN, debug khó hơn (`webrtc-internals`), kiểm thử tự động phức tạp hơn (giải quyết bằng fake host trong Playwright — 06 §3).
- Việc phải làm: coturn trong docker-compose; credential TURN tạm thời; Host chặn input khi là Observer vì DataChannel không đi qua server.
