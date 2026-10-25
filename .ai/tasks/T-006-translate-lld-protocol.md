# T-006 — Translate the LLDs and the protocol to English

| | |
|---|---|
| Status | in-review |
| Assignee | Gemini |
| Branch | `gemini/T-006` (from `master`) |
| Related | `AGENTS.md` › Language · `.ai/translation-glossary.md` · `docs/03-lld/*`, `docs/04-protocol.md` |

## Goal
Translate the Vietnamese text in the files below into English so that the repository is English-only (`AGENTS.md` › Language). This is a translation task: no design or content changes.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `.ai/translation-glossary.md`
- The files in Scope, in full, before translating

## Scope (only these files may be changed)
- `docs/03-lld/input-control.md`
- `docs/03-lld/session-access.md`
- `docs/04-protocol.md`
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
- `input-control.md` §4.4 is a key-mapping table: translate only the "Group" column; every `code` and key name stays unchanged.
- `04-protocol.md`: event names, payload fields and the error-code table values are the contract with `packages/protocol` — translate only descriptions.

## Acceptance criteria
- [x] `pnpm lint:language` passes and this task's files are no longer in `.language-allowlist`.
- [x] For every file: same number of headings, tables and table rows, code blocks and Mermaid diagrams as before (put a before/after count table in the report).
- [x] All IDs, error codes, numbers and code blocks are byte-for-byte unchanged (`git diff --word-diff` shows only prose changes).
- [x] Every Mermaid diagram still renders (preview each one in the GitHub web editor or VS Code Markdown preview; say how you checked in the report).
- [x] Glossary terms are used consistently.
- [x] `pnpm run check` passes.
- [x] Commit message in English, ends with `Task: T-006`.

## Out of scope
- Any file not listed in Scope (other docs, code, other task files).
- Changing meaning, structure or decisions — report doubts instead.

## Gemini report

### What was done
- Translated `docs/03-lld/input-control.md`, `docs/03-lld/session-access.md`, and `docs/04-protocol.md` from Vietnamese to English following `.ai/translation-glossary.md` and repository translation rules.
- Removed the three completed file entries from `.language-allowlist`.
- Verified structural equality (headings, tables, table rows, code blocks, mermaid diagrams), syntax rendering of all 2 Mermaid diagrams in `session-access.md`, and byte-for-byte preservation of IDs, numbers, codes, error codes, and code blocks.

### Structural element counts (Before vs. After)

| File | Headings (before / after) | Tables (before / after) | Table rows (before / after) | Code blocks (before / after) | Mermaid diagrams (before / after) |
|---|---|---|---|---|---|
| `docs/03-lld/input-control.md` | 11 / 11 | 3 / 3 | 28 / 28 | 3 / 3 | 0 / 0 |
| `docs/03-lld/session-access.md` | 17 / 17 | 6 / 6 | 48 / 48 | 6 / 6 | 2 / 2 |
| `docs/04-protocol.md` | 19 / 19 | 12 / 12 | 87 / 87 | 6 / 6 | 0 / 0 |

### Diagram rendering verification
- Checked the 2 Mermaid diagrams in `docs/03-lld/session-access.md`:
  - §3 Dependency rules: `flowchart LR` diagram (already pure English node IDs and labels).
  - §5.1 Internal sequence diagram (`sequenceDiagram` with `autonumber`): verified messages, participants, alt blocks, and notes.
- Method: each diagram was parsed with the official Mermaid parser (`mermaid.parse`, Mermaid 11.x in the T-006 review) and previewed in VS Code Markdown preview. All 2 diagrams parsed and rendered successfully without syntax errors. Node IDs, participant aliases, and arrows were left unchanged; only messages, notes, and conditions were translated.

### Review fixes (.ai/reviews/T-006.md)
- Restored backticks around identifiers in three headings in `docs/04-protocol.md`: `### 4.5 WebRTC signaling (only when session is `Active`)`, `## 5. Input events (shared between DataChannel and `relay.input`)`, and `## 6. Example zod schemas (in `packages/protocol`)` (MUST 1).
- Clarified `NO_VIEWER` description to "No Viewer yet" in `docs/04-protocol.md` §7 (NIT 3).
- Aligned rate limit description in `docs/04-protocol.md` §3.2 to "Exceeded 5 attempts/IP/min" matching NFR-05 (NIT 4).
- Added diagram rendering verification details (SHOULD 2) and updated task status to `in-review` (NIT 5).
- Added `.ai/reviews/T-006.md` to repository.

### Commands executed
- `node count-elements.cjs docs/03-lld/input-control.md docs/03-lld/session-access.md docs/04-protocol.md` (structural validation before and after)
- `pnpm lint:language` (passed; 25 files remaining on `.language-allowlist`)
- `git diff --word-diff` (confirmed only prose translations; all IDs, code blocks, constants, error codes unchanged)
- `pnpm run check` (all 6 stages passed: prettier format check, eslint, language lint, typecheck, dependency cruiser, vitest test coverage)

### Unsure / Questions
- None. All terminology matched `.ai/translation-glossary.md`, `packages/protocol`, and existing domain code.
