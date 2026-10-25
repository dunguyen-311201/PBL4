# AGENTS.md

Shared rules for every AI agent working in this repository (Claude, Gemini/Antigravity, …).

Remote desktop: Host App (Electron) · Viewer Web (React) · Signaling API (NestJS + Redis). The 2021 version is frozen at tag `v0-legacy-2021`; the 2026 version is being built from `docs/`.

**Read before every task:** [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md). How agents work together: [`docs/ai-workflow.md`](docs/ai-workflow.md).

## Language
- **Everything committed to this repository is written in English**: code, identifiers, comments, test names, log and error messages, docs, ADRs, task and review files, commit messages, PR titles and descriptions.
- Conversation with the maintainer may be in Vietnamese; what lands in the repo may not.
- Enforced by `pnpm lint:language` (part of `pnpm run check` and CI). Files still waiting for translation are listed in `.language-allowlist`; never add a file to it — only remove entries.

## Rules
- State a short plan (files, why, tests) before changing code. One PR = one goal.
- TDD for domain, use cases, adapters, the input mapper and protocol schemas.
- AI never approves and never merges. Commits are authored as `dunguyen-311201`.
- If a task contradicts `docs/`, stop and ask. If the design changes, update the LLD/protocol or add an ADR in the same PR; never edit an Accepted ADR.
- Network payloads are defined only in `packages/protocol` (zod); `docs/04-protocol.md` describes them.
- Use TypeScript 5.9; do not move to 7 until `typescript-eslint` supports it.
- `domain/` is plain TypeScript: no I/O, no `Date.now()`, no framework imports.
- Never log OTPs, tokens or screen content. Never put the role in a JWT. Every failed join returns `401 INVALID_CREDENTIALS`.
- Never claim numbers or features that do not exist yet (README, docs, CV).
- `pnpm run check` must pass before committing.

## Don't
- Don't merge the `measure/baseline` branch. Don't modify `legacy/`.
- Don't add a major library without an ADR. Don't apply DDD outside Session & Access (ADR-006).

## Commands
Node 22, pnpm via `corepack enable`: `pnpm i` · `pnpm run check` (format, lint, language, typecheck, architecture, tests + coverage — same as CI) · `pnpm test` · `pnpm build` · `pnpm --filter @pbl4/server test`.
Integration tests (`*.int.test.ts`, need a real Redis): `pnpm test:integration` — uses `REDIS_URL` if set, otherwise Testcontainers (needs Docker).
Legacy (Node 14.17.1 via nvm-windows, only on the `measure/baseline` branch): `cd Server; npm i; npm start` · `cd Client; npm i; npm start`.

## Notes
- On Windows, many files may show as "modified" only because of CRLF → check `git diff --ignore-cr-at-eol --stat` and do not commit those changes.
- Legacy uses `@jitsi/robotjs`. `Electron failed to install` → delete `node_modules\electron`, then `npm install electron@11`.
