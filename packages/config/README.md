# @pbl4/config

Cấu hình dùng chung cho mọi package:

- `tsconfig.base.json` — TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- `vitest` — `sharedVitestConfig({ thresholds })`, mỗi package tự đặt ngưỡng coverage theo `docs/06-test-strategy.md` §7.
