# Contributing

## Nhánh và commit
- Nhánh: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…` → PR vào `master`.
- Commit theo Conventional Commits: `feat(session): approve join request`, `test(session): lock after 5th wrong OTP`.
- Tác giả: `dunguyen-311201` <dunguyenhuu.it2019@gmail.com>.

## Trước khi mở PR
Làm theo **Definition of Done** trong [`docs/06-test-strategy.md` §9](docs/06-test-strategy.md#9-definition-of-done-cho-một-pr).

## Ở đâu có gì
| Cần biết | Đọc |
|---|---|
| Trạng thái và quyết định | `docs/PROJECT_SUMMARY.md` |
| Tên lớp, hàm, sự kiện (ubiquitous language) | `docs/02-domain-model.md` §2 |
| Cấu trúc code server, quy tắc phụ thuộc | `docs/03-lld/session-access.md` |
| Quy ước viết test, coverage | `docs/06-test-strategy.md` |
| Cấu hình bảo mật Electron, những gì không được log | `docs/05-security.md` |
