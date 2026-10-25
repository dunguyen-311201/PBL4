# T-007 — Translate security, test strategy and ADRs to English

| | |
|---|---|
| Status | ready |
| Assignee | Gemini |
| Branch | `gemini/T-007` (from `master`) |
| Related | `AGENTS.md` › Language · `.ai/translation-glossary.md` · `docs/05-security.md`, `docs/06-test-strategy.md`, `docs/adr/` |

## Goal
Translate the Vietnamese text in the files below into English so that the repository is English-only (`AGENTS.md` › Language). This is a translation task: no design or content changes.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `.ai/translation-glossary.md`
- The files in Scope, in full, before translating

## Scope (only these files may be changed)
- `docs/05-security.md`
- `docs/06-test-strategy.md`
- `docs/adr/0000-template.md`
- `docs/adr/ADR-001-rewrite-instead-of-patch.md`
- `docs/adr/ADR-002-webrtc-for-media.md`
- `docs/adr/ADR-003-relay-fallback.md`
- `docs/adr/ADR-004-session-code-otp-approval.md`
- `docs/adr/ADR-005-redis-state-postgres-audit.md`
- `docs/adr/ADR-006-clean-architecture-selective-ddd.md`
- `docs/adr/ADR-007-monorepo-shared-protocol.md`
- `docs/adr/README.md`
- `.language-allowlist` — remove only the entries for the files above

## Allowed new dependencies
- None.

## Translation rules (same for T-005 … T-009)
1. **Translate, do not rewrite.** Same meaning, same level of detail. Do not add, drop, merge or "improve" content, and do not fix the design. If a sentence is unclear or looks wrong, translate it faithfully and list it under *Unsure* in the report.
2. **Keep the structure identical:** same headings in the same order, same tables with the same rows and columns, same lists, same callouts. Line counts stay roughly the same.
3. **Do not touch:** code blocks (except comments and string labels inside them), file paths, identifiers, IDs (`FR-01`, `NFR-05`, `I1`, `D3`, `L9`, `S1`, `ADR-004`, `T-002`…), error codes, numbers, dates, URLs, and the commit/branch names.
4. **Mermaid diagrams:** translate only labels, notes and messages; keep node IDs, participants' aliases and syntax unchanged. The diagram must still render on GitHub (no unescaped quotes or parentheses inside labels that break the syntax).
5. **Terminology:** follow [`.ai/translation-glossary.md`](../translation-glossary.md). Terms already in English stay as they are.
6. **Style:** clear, concise technical English (US spelling), present tense, active voice; keep the tone of the original. Headings in sentence case.
7. **Links:** keep link targets. When you translate a heading, update links **inside your files** that point to it. Links from other files are fixed in T-009.
8. Remove your files from `.language-allowlist` (and only yours). `pnpm lint:language` must pass.

## Notes for this task
- Accepted ADRs are normally never edited (`AGENTS.md`). A **translation** is the one allowed exception: meaning must be identical; keep `Status: Accepted` and the dates.
- `06-test-strategy.md` §9 (Definition of Done) is linked from `CONTRIBUTING.md`; keep the section number.

## Acceptance criteria
- [ ] `pnpm lint:language` passes and this task's files are no longer in `.language-allowlist`.
- [ ] For every file: same number of headings, tables and table rows, code blocks and Mermaid diagrams as before (put a before/after count table in the report).
- [ ] All IDs, error codes, numbers and code blocks are byte-for-byte unchanged (`git diff --word-diff` shows only prose changes).
- [ ] Every Mermaid diagram still renders (preview each one in the GitHub web editor or VS Code Markdown preview; say how you checked in the report).
- [ ] Glossary terms are used consistently.
- [ ] `pnpm run check` passes.
- [ ] Commit message in English, ends with `Task: T-007`.

## Out of scope
- Any file not listed in Scope (other docs, code, other task files).
- Changing meaning, structure or decisions — report doubts instead.

## Gemini report
_(Filled in by Gemini when done.)_
