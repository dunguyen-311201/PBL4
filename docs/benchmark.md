# Benchmark

Ghi số liệu thật, đo trên cùng 2 máy và cùng mạng cho mọi phiên bản.

## Môi trường
| | Host | Viewer |
|---|---|---|
| Máy / CPU | | |
| Màn hình (độ phân giải, scale) | | |
| Mạng | | |

## Cách đo
- **fps:** số frame Viewer nhận được trong 30 giây ÷ 30 (bản legacy: đếm sự kiện `screen-data`; bản mới: `getStats` → `framesPerSecond`).
- **Kích thước frame / băng thông:** trung bình byte mỗi frame (legacy) hoặc `bytesReceived` theo thời gian (WebRTC).
- **Độ trễ input:** quay video 240fps hai màn hình cạnh nhau, đếm số frame từ lúc rê chuột trên Viewer đến lúc con trỏ Host di chuyển; lấy 20 mẫu, báo p50/p95.

## Kết quả
| Chỉ số | v0-legacy-2021 | v1 Relay | v1 WebRTC |
|---|---|---|---|
| fps | | | |
| KB/frame hoặc kbps | | | |
| Độ trễ input p50 / p95 (ms) | | | |
| Ghi chú | Đo với `@jitsi/robotjs` thay cho `robotjs@0.6.0` (không build được trên Node 14/Windows thiếu VS Build Tools); logic giữ nguyên | | |
