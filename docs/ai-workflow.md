# Quy trình phối hợp AI: Claude lập kế hoạch & review, Gemini thực hiện

Mục tiêu: giao việc nhỏ, đặc tả rõ cho Gemini (Antigravity CLI) để tiết kiệm token của Claude, nhưng vẫn giữ chất lượng bằng review và CI. Người (`dunguyen-311201`) luôn là người merge.

## Vai trò

| Ai | Làm gì | Không làm |
|---|---|---|
| **Claude** | Chia nhỏ việc, viết task, tự làm phần nhạy cảm, review kết quả | Approve/merge |
| **Gemini** (Antigravity `agy`) | Làm đúng một task: test → code → `pnpm run check` → commit | Đổi thiết kế, sửa ngoài phạm vi, mở PR, merge |
| **Bạn** | Chạy `agy`, push, mở PR, merge | — |

**Giao cho Gemini:** adapter đơn giản có hợp đồng rõ (port đã có), test bổ sung, tài liệu README cho package, UI theo mockup, refactor nhỏ.
**Claude giữ:** thiết kế, ADR, domain, concurrency (Lua, scheduler), xác thực/JWT/bảo mật, protocol, mọi thứ cần quyết định.

## Vòng làm việc

```mermaid
sequenceDiagram
    participant C as Claude
    participant U as Bạn
    participant G as Gemini (agy)
    C->>C: viết .ai/tasks/T-xxx.md (status: ready)
    U->>G: git switch -c gemini/T-xxx master; agy "Thực hiện .ai/tasks/T-xxx..."
    G->>G: test → code → pnpm run check → commit
    U->>C: "review T-xxx"
    C->>C: diff + chạy CI trên clone sạch + đối chiếu tiêu chí
    C->>C: viết .ai/reviews/T-xxx.md
    alt Cần sửa
        U->>G: agy "Sửa theo .ai/reviews/T-xxx.md"
    else Đạt
        U->>U: push, mở PR, merge
    end
```

## Lệnh cho bạn

```powershell
# một lần
irm https://antigravity.google/cli/install.ps1 | iex
agy            # đăng nhập bằng tài khoản Google (gói sinh viên)

# mỗi task
git switch master; git pull
git switch -c gemini/T-001
agy            # rồi gõ: Thực hiện .ai/tasks/T-001-crypto-adapters.md
```

Nên dùng chế độ tương tác (`agy`) và xem từng thay đổi trước khi cho phép. Chế độ không tương tác (`agy -p "..."`) chặn lệnh shell cho tới khi được cấp quyền, nên Gemini sẽ không tự chạy được `pnpm run check`.

Sau khi Gemini commit: nhắn Claude **"review T-001"**.

## Định dạng

- **Task** (`.ai/tasks/T-xxx-<tên>.md`): theo [`TEMPLATE.md`](../.ai/tasks/TEMPLATE.md) — mục tiêu, tài liệu tham chiếu, phạm vi file, dependency được phép, hợp đồng (interface), tiêu chí chấp nhận có thể kiểm, test bắt buộc, ngoài phạm vi.
- **Review** (`.ai/reviews/T-xxx.md`): kết luận (`READY_FOR_HUMAN` / `CHANGES_REQUESTED`), kết quả CI trên clone sạch, đối chiếu từng tiêu chí, danh sách `MUST` / `SHOULD` / `NIT` kèm file:dòng.
- Trạng thái task ghi ở đầu file: `ready` → `in-progress` → `in-review` → `done`.

## Claude review những gì
1. CI đầy đủ trên clone sạch của nhánh (không tin "đã chạy rồi").
2. Từng tiêu chí chấp nhận trong task — có test chứng minh không.
3. Diff chỉ nằm trong phạm vi task; không sửa/xoá test cũ; không thêm dependency ngoài danh sách.
4. Đúng quy tắc `AGENTS.md`: tầng phụ thuộc, không log bí mật, không `any`, đặt tên theo ubiquitous language.
5. Test có kiểm hành vi thật (không chỉ tăng coverage), có trường hợp lỗi.
