# Remote Desktop Control

Điều khiển máy tính từ xa qua trình duyệt: Host chia sẻ màn hình bằng một ứng dụng Electron, Viewer xem và điều khiển chuột/bàn phím.

> **Trạng thái: redesign in progress.**
> Bản gốc là đồ án môn học năm 2021 (Electron + Node.js + Socket.IO), được giữ nguyên trong [`legacy/`](legacy/) và tag `v0-legacy-2021`.
> Bản 2026 được thiết kế lại với phiên có xác thực, WebRTC và kiến trúc kiểm thử đầy đủ.

## Tài liệu thiết kế
Bắt đầu từ **[Project Summary](docs/PROJECT_SUMMARY.md)** — trạng thái, quyết định đã chốt và bản đồ tài liệu.

| Tài liệu | Nội dung |
|---|---|
| [Requirements](docs/00-requirements.md) | Yêu cầu chức năng, phi chức năng, truy vết lỗi bản 2021 |
| [High-Level Design](docs/01-hld.md) | C4 context/container, luồng chính, deployment |
| [Domain Model](docs/02-domain-model.md) | DDD: bounded context, aggregate `RemoteSession`, state machine, domain events |
| [LLD — Session & Access](docs/03-lld/session-access.md) | Clean architecture trong NestJS, ports, use cases, Redis, scheduler |
| [Protocol](docs/04-protocol.md) | REST, WebSocket, DataChannel, token, mã lỗi |
| [Security](docs/05-security.md) | Threat model STRIDE, rủi ro còn tồn tại, kiểm thử bảo mật |
| [Test Strategy](docs/06-test-strategy.md) | Kim tự tháp test, TDD, ma trận truy vết, CI |
| [ADR](docs/adr/) | 7 quyết định kiến trúc |
| [Benchmark](docs/benchmark.md) | Số liệu bản 2021 và bản mới |

Viết trước khi implement từng phần: LLD cho signaling, media, input, host app.

## Kiến trúc mục tiêu (tóm tắt)
- **Host App** — Electron + TypeScript
- **Viewer Web** — React + Vite
- **Signaling API** — NestJS, Socket.IO, Redis, PostgreSQL
- **Media** — WebRTC peer-to-peer, TURN (coturn), fallback relay qua Socket.IO

## Bản 2021 (legacy)
Electron app chụp màn hình mỗi 500ms và gửi qua một Socket.IO relay; trang web phía người điều khiển gửi ngược sự kiện chuột/phím, thực thi bằng `robotjs`. Các hạn chế đã biết được liệt kê trong [Requirements §8](docs/00-requirements.md#8-truy-vết-lỗi-bản-2021--yêu-cầu).
