# 00 — Requirements

| | |
|---|---|
| Trạng thái | Draft v0.2 (đã chốt Q1–Q3) |
| Cập nhật | 2026-10-23 |
| Tác giả | Nguyen Huu Du (`dunguyen-311201`) |
| Liên quan | [01-hld.md](01-hld.md) · [ADR-001](adr/ADR-001-rewrite-instead-of-patch.md) |

## 1. Bối cảnh

Bản 2021 (tag `v0-legacy-2021`) là đồ án môn học: một Electron app trên máy bị điều khiển chụp màn hình mỗi 500ms, gửi ảnh PNG base64 qua một Socket.IO relay; một trang HTML phía người điều khiển hiển thị ảnh và gửi ngược sự kiện chuột/phím, được thực thi bằng `robotjs`.

Bản này chạy được trong một máy/LAN nhưng có lỗi chức năng, hiệu năng thấp và không có lớp bảo mật nào. Bản redesign xây lại hệ thống theo hướng một sản phẩm remote desktop tối thiểu nhưng đúng và an toàn.

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| **Host** | Người/máy chia sẻ màn hình và bị điều khiển. Chạy Host App (Electron). |
| **Viewer** | Người xem/điều khiển từ xa. Dùng Viewer Web (trình duyệt). |
| **Session** | Một phiên kết nối giữa đúng 1 Host và tối đa 1 Viewer. |
| **Session Code** | Mã 9 chữ số định danh phiên, Host đọc cho Viewer. |
| **One-time Password (OTP)** | Mật khẩu ngắn đi kèm Session Code, dùng một lần, có hạn. |
| **Join Request** | Yêu cầu tham gia của Viewer, chờ Host duyệt. |
| **Controller / Observer** | Viewer có quyền điều khiển / chỉ được xem. |
| **Media Channel** | Kênh truyền hình ảnh màn hình (WebRTC, hoặc relay khi fallback). |
| **Input Channel** | Kênh truyền sự kiện chuột/phím từ Viewer về Host. |
| **Fallback Relay** | Chế độ truyền ảnh JPEG qua server Socket.IO khi WebRTC không kết nối được. |

## 3. Actors

- **Host user** — mở Host App, tạo phiên, duyệt hoặc từ chối Viewer, thu hồi quyền, kết thúc phiên.
- **Viewer user** — mở Viewer Web, nhập mã + OTP, xem và điều khiển khi được duyệt.
- **System** — tự hết hạn phiên/OTP, ghi audit log.

## 4. Functional requirements

### 4.1 Vòng đời phiên

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-01 | Host tạo phiên và nhận Session Code (9 chữ số) + OTP (6 chữ số). | Must |
| FR-02 | Host có thể tạo lại OTP mới; OTP cũ mất hiệu lực ngay. | Should |
| FR-03 | Viewer gửi Join Request bằng Session Code + OTP. | Must |
| FR-04 | Host nhận thông báo Join Request và chọn Cho phép / Từ chối. | Must |
| FR-05 | Khi được cho phép, Viewer nhận quyền **Controller** (mặc định) hoặc **Observer** do Host chọn. | Must |
| FR-06 | Host chuyển Viewer giữa Controller ⇄ Observer bất kỳ lúc nào. | Should |
| FR-07 | Host hoặc Viewer có thể kết thúc phiên; phía còn lại được thông báo. | Must |
| FR-08 | Phiên chưa có Viewer tự hết hạn sau 10 phút; OTP hết hạn sau 10 phút hoặc sau lần join thành công. | Must |
| FR-09 | Mỗi phiên chỉ có tối đa 1 Viewer tại một thời điểm. | Must |
| FR-09a | Phiên đang hoạt động tự kết thúc sau tối đa **2 giờ** kể từ lúc được duyệt; Host và Viewer được cảnh báo trước 5 phút. | Must |
| FR-09b | Mọi phiên đều cần Host có mặt để duyệt; không hỗ trợ truy cập khi Host vắng mặt (unattended access). | Must |

### 4.2 Hình ảnh

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-10 | Viewer xem được màn hình chính của Host theo thời gian thực. | Must |
| FR-11 | Hệ thống ưu tiên kết nối WebRTC; nếu không thiết lập được trong 10 giây, tự chuyển sang Fallback Relay. | Must |
| FR-12 | Viewer thấy chế độ đang dùng (WebRTC / Relay) và chỉ số fps, RTT, bitrate. | Should |
| FR-13 | Viewer có thể bật toàn màn hình. | Could |

### 4.3 Điều khiển

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-20 | Controller điều khiển chuột: di chuyển, click trái/phải/giữa, double-click, kéo thả, cuộn. | Must |
| FR-21 | Controller gõ được mọi phím thông dụng: chữ, số, ký tự đặc biệt, Enter, Backspace, Tab, Esc, mũi tên, F1–F12, và tổ hợp với Shift/Ctrl/Alt. | Must |
| FR-22 | Vị trí chuột trên Host khớp vị trí trên Viewer ở mọi độ phân giải và tỉ lệ DPI. | Must |
| FR-23 | Observer không gửi được sự kiện điều khiển (bị chặn ở cả Viewer và server). | Must |
| FR-24 | Host có phím tắt khẩn cấp để thu hồi quyền điều khiển ngay lập tức. | Should |

### 4.4 Audit

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-30 | Ghi lại các sự kiện: tạo phiên, Join Request, cho phép/từ chối, đổi quyền, kết thúc, hết hạn — kèm thời điểm và IP. | Should |

## 5. Non-functional requirements

| ID | Thuộc tính | Yêu cầu đo được | Cách kiểm chứng |
|---|---|---|---|
| NFR-01 | Độ trễ input | p95 < 150ms trong LAN (WebRTC) | Đo trong `benchmark.md` |
| NFR-02 | Tốc độ khung hình | ≥ 15 fps ở chiều rộng 1280px (WebRTC); ≥ 5 fps ở Relay | `getStats` / đếm frame |
| NFR-03 | Băng thông | Relay ≤ 1.5 Mbps ở 1280px, 5 fps | Đo trong `benchmark.md` |
| NFR-04 | Bảo mật truyền tải | Mọi kết nối được mã hoá: HTTPS/WSS cho API, DTLS-SRTP cho WebRTC | Kiểm tra cấu hình deploy |
| NFR-05 | Chống dò mã | Tối đa 5 lần join sai / IP / phút; mã + OTP đủ entropy | e2e test rate limit |
| NFR-06 | Bền vững | Server không crash với payload sai định dạng hoặc quá lớn (giới hạn 1 MB) | e2e test với payload lỗi |
| NFR-07 | Mở rộng | Chạy ≥ 2 instance server phía sau load balancer mà phiên vẫn hoạt động | Integration test với Redis adapter |
| NFR-08 | Bảo mật Host App | `contextIsolation: true`, `nodeIntegration: false`, IPC theo whitelist, có CSP | Review cấu hình + test |
| NFR-09 | Chất lượng mã | TypeScript strict; coverage domain ≥ 90%; CI chạy lint, typecheck, test | CI |
| NFR-10 | Khả năng quan sát | Log có cấu trúc (JSON) kèm `sessionId`; không log OTP, JWT hay nội dung màn hình | Review + test |

## 6. Ràng buộc

- Host App chạy trên **Windows 10/11** (bản demo chính). macOS ghi nhận là "best effort" do cần quyền Screen Recording và Accessibility.
- Viewer chạy trên Chrome/Edge bản hiện hành.
- Stack: TypeScript, NestJS, React, Electron, Redis, PostgreSQL, coturn — chọn để khớp kinh nghiệm hiện có và tài liệu hoá trong ADR.
- Một người phát triển, thời gian ~5 tuần.

## 7. Ngoài phạm vi (v1)

Truyền file, nhiều màn hình, âm thanh, chat, tài khoản người dùng/đăng nhập, ứng dụng mobile, nhiều Viewer cùng lúc, ghi hình phiên, truy cập khi Host vắng mặt (unattended access).

## 8. Truy vết lỗi bản 2021 → yêu cầu

| # | Lỗi trong bản 2021 | Vị trí | Yêu cầu khắc phục |
|---|---|---|---|
| L1 | Phím chữ không gõ được: chỉ gửi keydown cho Shift/Ctrl, host chỉ gọi `keyToggle(key,'up')` | `display.html`, `Client/app.js` | FR-21 |
| L2 | Tên phím trình duyệt không khớp tên phím robotjs | `Client/app.js` | FR-21 |
| L3 | Toạ độ chuột hard-code `*4/3` | `Client/app.js` | FR-22 |
| L4 | Thiếu kéo thả, double-click, cuộn; chuột giữa bị coi là chuột trái | `display.html`, `Client/app.js` | FR-20 |
| L5 | Viewer kết nối cứng `http://localhost:5000` | `display.html` | FR-10 |
| L6 | `JSON.parse` không try/catch trên server | `Server/index.js` | NFR-06 |
| L7 | Điều kiện `&&` sai; `prompt` trả về `null` gây crash | `Client/app.js`, `display.html` | NFR-06 |
| L8 | Listener đăng ký lại mỗi lần Start; Stop trước Start gây crash | `Client/app.js` | FR-07 |
| L9 | PNG base64 + JSON, `setInterval` không backpressure, ~2 fps | `Client/app.js` | FR-11, NFR-02, NFR-03 |
| L10 | `mousemove` không throttle | `display.html` | NFR-01 |
| L11 | Không xác thực; UUID room không đổi giữa các phiên; không cần Host duyệt | toàn hệ thống | FR-01…FR-09, NFR-05 |
| L12 | HTTP thuần, hình ảnh và phím truyền không mã hoá | toàn hệ thống | NFR-04 |
| L13 | Electron `nodeIntegration: true`, không `contextIsolation` | `Client/app.js` | NFR-08 |
| L14 | Mô hình public IP + port 5000 cần mở port, không vượt NAT | `Server/index.js` | FR-11 |

## 9. Quyết định đã chốt (2026-10-23)

| # | Câu hỏi | Quyết định | Ghi chú |
|---|---|---|---|
| Q1 | Định dạng OTP | **6 chữ số** | Dễ đọc qua điện thoại. Không gian 10⁶ nhỏ hơn OTP chữ + số, nên an toàn dựa vào nhiều lớp: Session Code 9 số, rate limit 5 lần/IP/phút, OTP hết hạn 10 phút, **khoá phiên sau 5 lần sai liên tiếp** (FR-03a), và Host luôn phải duyệt. Phân tích trong `05-security.md`. |
| Q2 | Truy cập khi Host vắng mặt | **Không hỗ trợ** | FR-09b. Đưa vào "Ngoài phạm vi". |
| Q3 | Thời lượng tối đa của phiên | **2 giờ** | FR-09a; cảnh báo trước 5 phút. |

Bổ sung từ Q1:

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-03a | Sau 5 lần nhập sai OTP liên tiếp cho cùng một phiên, phiên bị khoá join và Host được thông báo; Host có thể tạo OTP mới (FR-02) để mở lại. | Must |
