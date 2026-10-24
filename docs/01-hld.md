# 01 — High-Level Design

| | |
|---|---|
| Trạng thái | Draft v0.1 |
| Cập nhật | 2026-10-23 |
| Liên quan | [00-requirements.md](00-requirements.md) · [02-domain-model.md](02-domain-model.md) · [adr/](adr/) |

## 1. Tóm tắt

Hệ thống gồm một **Host App** (Electron) trên máy bị điều khiển, một **Viewer Web** (React) trên trình duyệt người điều khiển, và một **Signaling API** (NestJS) đứng giữa để quản lý phiên, xác thực và trao đổi thông tin kết nối.

Hình ảnh và input **không đi qua server** khi WebRTC thành công: chúng đi peer-to-peer (hoặc qua TURN) và được mã hoá đầu-cuối bằng DTLS-SRTP. Server chỉ chuyển hình ảnh khi phải dùng **Fallback Relay**.

## 2. C4 Level 1 — System Context

```mermaid
flowchart LR
    host([Host user]):::person
    viewer([Viewer user]):::person
    sys[Remote Desktop System]:::system
    stun[(Public STUN)]:::ext

    host -- "Tạo phiên, duyệt Viewer,<br/>chia sẻ màn hình" --> sys
    viewer -- "Nhập mã + OTP,<br/>xem và điều khiển" --> sys
    sys -- "Khám phá địa chỉ public<br/>(ICE)" --> stun

    classDef person fill:#dbeafe,stroke:#1d4ed8,color:#111
    classDef system fill:#1d4ed8,stroke:#1e3a8a,color:#fff
    classDef ext fill:#e5e7eb,stroke:#6b7280,color:#111
```

## 3. C4 Level 2 — Containers

```mermaid
flowchart TB
    subgraph hostpc[Máy Host - Windows]
        hostapp["Host App<br/><i>Electron + TypeScript</i><br/>Chụp màn hình, thực thi input,<br/>UI duyệt Viewer"]
    end

    subgraph browser[Trình duyệt Viewer]
        viewerweb["Viewer Web<br/><i>React + Vite + TypeScript</i><br/>Nhập mã, hiển thị màn hình,<br/>gửi input"]
    end

    subgraph cloud[Server / VPS]
        api["Signaling API<br/><i>NestJS</i><br/>REST: tạo/join phiên<br/>WS Gateway: duyệt, signaling, relay"]
        redis[("Redis<br/>Session state (TTL)<br/>Socket.IO adapter<br/>Rate limit")]
        pg[("PostgreSQL<br/>Audit log")]
        turn["coturn<br/>TURN/STUN"]
    end

    hostapp -- "HTTPS + WSS<br/>(phiên, signaling, relay)" --> api
    viewerweb -- "HTTPS + WSS" --> api
    api --> redis
    api --> pg
    hostapp <-. "WebRTC: media + DataChannel<br/>(DTLS-SRTP, P2P)" .-> viewerweb
    hostapp <-. "khi P2P thất bại" .-> turn
    viewerweb <-. "khi P2P thất bại" .-> turn
```

| Container | Công nghệ | Trách nhiệm | Không làm |
|---|---|---|---|
| Host App | Electron, `desktopCapturer`, `@jitsi/robotjs` | Tạo phiên, hiển thị Join Request, chụp & stream màn hình, thực thi input đã được xác thực | Không tự quyết quyền; quyền do server cấp |
| Viewer Web | React, Vite | Nhập mã + OTP, hiển thị video/ảnh, thu input, hiển thị chỉ số | Không giữ bí mật lâu dài (chỉ JWT ngắn hạn trong bộ nhớ) |
| Signaling API | NestJS, Socket.IO | Vòng đời phiên, xác thực, cấp JWT, relay signaling, Fallback Relay, rate limit, phát domain event | Không lưu nội dung màn hình |
| Redis | Redis 7 | Trạng thái phiên có TTL, ánh xạ code → session, Socket.IO adapter, bộ đếm rate limit | Không là nguồn audit |
| PostgreSQL | PostgreSQL 16 | Audit log bất biến | Không giữ trạng thái phiên đang chạy |
| coturn | coturn | TURN relay khi P2P không thông, credential tạm thời | — |

## 4. Luồng chính

### 4.1 Tạo phiên và duyệt Viewer (FR-01…FR-05)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant R as Redis
    participant V as Viewer Web

    H->>A: POST /sessions
    A->>R: lưu Session(Created→WaitingForViewer), code→id, OTP hash, TTL 10'
    A-->>H: { sessionId, code (9 số), otp (6 số), hostToken }
    H->>A: WS connect (auth: hostToken)
    Note over H: Host đọc code + OTP cho Viewer

    V->>A: POST /sessions/join { code, otp }
    A->>A: rate limit theo IP
    A->>R: kiểm tra trạng thái + OTP, đánh dấu OTP đã dùng, chuyển → PendingApproval
    A-->>V: { joinRequestId } (202)
    A-->>H: WS "join.requested" { joinRequestId, ip }
    H->>A: WS "join.approve" { joinRequestId, role }
    A->>R: chuyển → Active, đặt hạn 2 giờ
    A-->>V: WS/poll "join.approved" { viewerToken (JWT, TTL ngắn), role, iceServers }
    V->>A: WS connect (auth: viewerToken)
```

### 4.2 Thiết lập WebRTC (FR-10, FR-20, FR-21)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant V as Viewer Web

    H->>H: desktopCapturer → MediaStream
    H->>A: "rtc.offer" { sdp }
    A->>A: kiểm tra cả hai thuộc cùng phiên Active
    A-->>V: "rtc.offer" { sdp }
    V->>A: "rtc.answer" { sdp }
    A-->>H: "rtc.answer" { sdp }
    H-)A: "rtc.ice" (nhiều lần)
    A--)V: "rtc.ice"
    V-)A: "rtc.ice" (nhiều lần)
    A--)H: "rtc.ice"
    Note over H,V: ICE thành công → media track + DataChannel "input"
    V-)H: input qua DataChannel (pointer unordered, key/click ordered)
```

### 4.3 Fallback Relay (FR-11)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant V as Viewer Web

    Note over H,V: ICE thất bại hoặc quá 10 giây
    V->>A: "media.fallback" { reason }
    A-->>H: "media.fallback"
    loop mỗi frame
        H->>A: "relay.frame" (binary JPEG) + ack
        A-->>V: "relay.frame" (binary)
        V-->>A: ack
        A-->>H: ack → Host mới chụp frame tiếp (backpressure)
    end
    V->>A: "relay.input" { ... }
    A->>A: kiểm tra role = controller
    A-->>H: "relay.input"
```

### 4.4 Kết thúc và hết hạn (FR-07, FR-08)

```mermaid
sequenceDiagram
    autonumber
    participant H as Host App
    participant A as Signaling API
    participant R as Redis
    participant V as Viewer Web

    alt Host hoặc Viewer kết thúc
        H->>A: "session.terminate"
        A->>R: chuyển → Terminated, xoá khoá
        A-->>V: "session.terminated"
    else Hết hạn (TTL)
        R-->>A: keyspace notification / job quét
        A-->>H: "session.expired"
    end
    A->>A: phát domain event → Audit ghi PostgreSQL
```

## 5. Deployment

**Local (phát triển):** `docker-compose` gồm `api`, `redis`, `postgres`, `coturn`; Viewer chạy `vite dev`; Host App chạy `electron .`.

**Demo:** một VPS chạy docker-compose phía sau Caddy/Nginx (TLS tự động) với domain riêng; coturn mở cổng UDP/TCP 3478 và dải cổng relay; Host App đóng gói bằng `electron-builder` (Windows) và phát hành qua GitHub Releases.

```mermaid
flowchart LR
    subgraph vps[VPS]
        proxy[Caddy - TLS] --> api1[api]
        proxy --> api2[api - instance 2]
        api1 --> redis[(redis)]
        api2 --> redis
        api1 --> pg[(postgres)]
        turn[coturn :3478 UDP/TCP]
    end
    viewer[Viewer - trình duyệt] -- WSS/HTTPS --> proxy
    host[Host App] -- WSS/HTTPS --> proxy
```

## 6. Thuộc tính chất lượng → quyết định thiết kế

| NFR | Quyết định | ADR |
|---|---|---|
| NFR-01, NFR-02 Độ trễ, fps | WebRTC (UDP, codec video, congestion control) cho media; DataChannel cho input; pointer unordered | ADR-002 |
| NFR-03 Băng thông relay | JPEG nhị phân, giảm độ phân giải, ack-based backpressure | ADR-003 |
| NFR-04 Mã hoá | WSS/HTTPS qua reverse proxy; DTLS-SRTP mặc định của WebRTC | ADR-002 |
| NFR-05 Chống dò mã | Mã 9 số + OTP + Host duyệt + rate limit trong Redis | ADR-004 |
| NFR-06 Bền vững | Validate mọi payload bằng schema dùng chung; giới hạn kích thước | ADR-007 |
| NFR-07 Mở rộng | Trạng thái phiên trong Redis, Socket.IO Redis adapter; server stateless | ADR-005 |
| NFR-08 Bảo mật Host | `contextIsolation`, preload + `contextBridge`, IPC whitelist | (LLD host-app) |
| NFR-09 Chất lượng | Clean architecture, DDD ở Session & Access, TDD | ADR-006 |

## 7. Rủi ro kiến trúc

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Invariant "1 Viewer/phiên" bị vi phạm khi 2 instance xử lý đồng thời | Hai người cùng điều khiển | Chuyển trạng thái nguyên tử trong Redis (Lua script hoặc `WATCH/MULTI`) |
| ICE thất bại ở mạng doanh nghiệp | Không xem được màn hình | TURN qua TCP/443; Fallback Relay |
| Native module (`robotjs`) không build trên Electron mới | Không điều khiển được | `@jitsi/robotjs` + `electron-rebuild`; dự phòng `nut.js` |
| Relay tiêu tốn băng thông server | Chi phí, nghẽn | Giới hạn fps/độ phân giải ở relay; chỉ dùng khi cần |

## 8. Việc tiếp theo

- `02-domain-model.md`: chi tiết aggregate `RemoteSession`, invariants, state machine, domain events.
- `04-protocol.md`: bảng sự kiện WS/DataChannel và REST theo các luồng ở mục 4.
- `05-security.md`: STRIDE cho từng container ở mục 3.
