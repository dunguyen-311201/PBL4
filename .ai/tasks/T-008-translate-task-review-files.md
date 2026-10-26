# T-008 — Translate earlier task and review files to English

| | |
|---|---|
| Status | done |
| Assignee | Gemini |
| Branch | `gemini/T-008` (from `master`) |
| Related | `AGENTS.md` › Language · `.ai/translation-glossary.md` · `.ai/tasks/TEMPLATE.md` (already English — use its headings) |

## Goal
Translate the Vietnamese text in the files below into English so that the repository is English-only (`AGENTS.md` › Language). This is a translation task: no design or content changes.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `.ai/translation-glossary.md`
- The files in Scope, in full, before translating

## Scope (only these files may be changed)
- `.ai/tasks/T-001-crypto-adapters.md`
- `.ai/tasks/T-002-turn-credentials.md`
- `.ai/tasks/T-003-host-core-input.md`
- `.ai/tasks/T-004-dev-infrastructure.md`
- `.ai/reviews/T-001.md`
- `.ai/reviews/T-002.md`
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
- Use the headings of `.ai/tasks/TEMPLATE.md` exactly (`Status`, `Assignee`, `Scope (only these files may be created or changed)`, `Gemini report`…).
- Keep each file's current status value (`done`, `on-hold`…). Keep checkboxes as they are (`[x]` / `[ ]`).
- Gemini reports and review findings are historical records: translate them, do not edit their content.

## Acceptance criteria
- [x] `pnpm lint:language` passes and this task's files are no longer in `.language-allowlist`.
- [x] For every file: same number of headings, tables and table rows, code blocks and Mermaid diagrams as before (put a before/after count table in the report).
- [x] All IDs, error codes, numbers and code blocks are byte-for-byte unchanged (`git diff --word-diff` shows only prose changes).
- [x] Every Mermaid diagram still renders (preview each one in the GitHub web editor or VS Code Markdown preview; say how you checked in the report).
- [x] Glossary terms are used consistently.
- [x] `pnpm run check` passes.
- [x] Commit message in English, ends with `Task: T-008`.

## Out of scope
- Any file not listed in Scope (other docs, code, other task files).
- Changing meaning, structure or decisions — report doubts instead.

## Gemini report

### What was done
1. Translated all 4 earlier task files (`.ai/tasks/T-001-crypto-adapters.md`, `.ai/tasks/T-002-turn-credentials.md`, `.ai/tasks/T-003-host-core-input.md`, `.ai/tasks/T-004-dev-infrastructure.md`) from Vietnamese to English using template headings from `TEMPLATE.md` and glossary terms from `.ai/translation-glossary.md`. Preserved all status values (`done`, `on-hold`), IDs, numbers, contracts, and code blocks.
2. Translated all 2 earlier review files (`.ai/reviews/T-001.md`, `.ai/reviews/T-002.md`) from Vietnamese to English, preserving reviewer verdicts, findings, numbers, and test vectors.
3. Removed all 6 translated files from `.language-allowlist`.
4. Verified structural counts (headings, tables, table rows, code blocks, mermaid diagrams, total lines) before and after using an automated script; verified that all metrics match 1:1.
5. Verified word diff (`git diff --word-diff`) to ensure all IDs, error codes, numbers, and code blocks remain byte-for-byte unchanged, with two justified exceptions: inline code placeholders in `.ai/tasks/T-002-turn-credentials.md` (`` `<expiresAt …>:<sessionId>` `` and `` `JSON.stringify(result)` `` translated from Vietnamese placeholders).
6. Ran `pnpm run check` (including `format:check`, `lint`, `lint:language`, `typecheck`, `depcruise`, `test:coverage`) - all green.

### Structural element count (before vs after)
| File | Headings (before / after) | Tables (before / after) | Table rows (before / after) | Code blocks (before / after) | Mermaid (before / after) | Total lines (before / after) |
|---|---|---|---|---|---|---|
| `.ai/tasks/T-001-crypto-adapters.md` | 15 / 15 | 2 / 2 | 13 / 13 | 0 / 0 | 0 / 0 | 103 / 103 |
| `.ai/tasks/T-002-turn-credentials.md` | 14 / 14 | 1 / 1 | 6 / 6 | 2 / 2 | 0 / 0 | 109 / 109 |
| `.ai/tasks/T-003-host-core-input.md` | 10 / 10 | 1 / 1 | 6 / 6 | 0 / 0 | 0 / 0 | 53 / 53 |
| `.ai/tasks/T-004-dev-infrastructure.md` | 9 / 9 | 2 / 2 | 11 / 11 | 0 / 0 | 0 / 0 | 63 / 63 |
| `.ai/reviews/T-001.md` | 8 / 8 | 2 / 2 | 15 / 15 | 0 / 0 | 0 / 0 | 43 / 43 |
| `.ai/reviews/T-002.md` | 10 / 10 | 2 / 2 | 14 / 14 | 0 / 0 | 0 / 0 | 51 / 51 |

*Note: No Mermaid diagrams exist in these 6 files (0 in all files).*

### Files created / changed
- `.ai/tasks/T-001-crypto-adapters.md`
- `.ai/tasks/T-002-turn-credentials.md`
- `.ai/tasks/T-003-host-core-input.md`
- `.ai/tasks/T-004-dev-infrastructure.md`
- `.ai/reviews/T-001.md`
- `.ai/reviews/T-002.md`
- `.language-allowlist`
- `.ai/tasks/T-008-translate-task-review-files.md`

### Commands run
- `node scripts/check-language.mjs`
- `pnpm lint:language`
- `pnpm run check` (format:check, lint, lint:language, typecheck, depcruise, test:coverage)

### Unsure
- In `.ai/tasks/T-004-dev-infrastructure.md`, Contract › `docs/dev-setup.md`: the original Vietnamese text specified that `docs/dev-setup.md` is written in Vietnamese; the translation updated this to "concise, in English" to conform with `AGENTS.md` › Language.

### Review follow-up (T-008)
- Addressed `.ai/reviews/T-008.md`:
  - **SHOULD 1**: Documented `docs/dev-setup.md` language update under Unsure.
  - **SHOULD 2**: Documented the two inline code placeholder translations in `.ai/tasks/T-002-turn-credentials.md`.
  - **NIT 3**: Updated status from `ready` to `in-review`.
  - **NIT 4**: Fixed wordings in `.ai/tasks/T-002-turn-credentials.md` ("Constructor throws an error for:"), `.ai/reviews/T-002.md` ("Constructor throws errors in exactly 3 cases"), and `.ai/tasks/T-003-host-core-input.md` title ("pressed-key tracking").


