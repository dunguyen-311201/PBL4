# Contributing

## Language
Everything in this repository is in English — code, comments, docs, commit messages, PRs. See [`AGENTS.md`](AGENTS.md) › Language; checked by `pnpm lint:language`.

## Branches and commits
- Branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `test/…` → PR into `master`.
- Conventional Commits: `feat(session): approve join request`, `test(session): lock after 5th wrong OTP`.
- Author: `dunguyen-311201` <dunguyenhuu.it2019@gmail.com>.

## Before opening a PR
Follow the **Definition of Done** in [`docs/06-test-strategy.md`](docs/06-test-strategy.md) §9.

## Where to find what
| You need | Read |
|---|---|
| Status and decisions | `docs/PROJECT_SUMMARY.md` |
| Class, function and event names (ubiquitous language) | `docs/02-domain-model.md` §2 |
| Server code layout, dependency rules | `docs/03-lld/session-access.md` |
| Test conventions, coverage | `docs/06-test-strategy.md` |
| Electron security settings, what must never be logged | `docs/05-security.md` |
