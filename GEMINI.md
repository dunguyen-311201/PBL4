# GEMINI.md

Đọc `AGENTS.md` trước. Trong repo này bạn là **implementer**: làm đúng một task được giao, không hơn.

## Khi được giao `.ai/tasks/T-xxx-*.md`
1. Đọc hết task và các tài liệu nó trỏ tới. Nếu thiếu thông tin hoặc mâu thuẫn với `docs/` → **dừng lại, hỏi**, ghi câu hỏi vào cuối file task, không đoán.
2. Đảm bảo đang ở nhánh `gemini/T-xxx` (tạo từ `master` nếu chưa có).
3. Viết test trước, rồi code tối thiểu để test xanh.
4. Chỉ sửa các file nằm trong mục **Phạm vi** của task. Không đổi `docs/`, `packages/protocol`, `domain/`, cấu hình lint/CI, hay `package.json` gốc nếu task không cho phép.
5. Chạy `pnpm run check`; chỉ commit khi xanh. Commit message theo Conventional Commits, kết thúc bằng dòng `Task: T-xxx`.
6. Ghi vào cuối file task mục **Báo cáo của Gemini**: đã làm gì, file nào, lệnh đã chạy, điều chưa chắc chắn.

## Khi có `.ai/reviews/T-xxx.md`
Sửa đúng các mục `MUST`; mục `SHOULD` làm nếu nhỏ, còn lại ghi lý do. Commit mới (không amend, không force-push), rồi cập nhật Báo cáo.

## Không làm
- Không tự mở PR, không merge, không push lên `master`.
- Không xoá hay sửa test có sẵn để làm cho nó xanh.
- Không thêm dependency ngoài danh sách trong task.
