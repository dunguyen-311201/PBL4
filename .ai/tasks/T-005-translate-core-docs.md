# T-005 — Translate requirements, HLD and domain model to English

| | |
|---|---|
| Status | in-review |
| Assignee | Gemini |
| Branch | `gemini/T-005` (from `master`) |
| Related | `AGENTS.md` › Language · `.ai/translation-glossary.md` · `docs/00-requirements.md`, `docs/01-hld.md`, `docs/02-domain-model.md` |

## Goal
Translate the Vietnamese text in the files below into English so that the repository is English-only (`AGENTS.md` › Language). This is a translation task: no design or content changes.

## Read first
- `AGENTS.md`, `GEMINI.md`
- `.ai/translation-glossary.md`
- The files in Scope, in full, before translating

## Scope (only these files may be changed)
- `docs/00-requirements.md`
- `docs/01-hld.md`
- `docs/02-domain-model.md`
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
- `02-domain-model.md` §2 is the **ubiquitous language**: the English names in the code column are the source of truth — keep them exactly; translate only the descriptions.
- `00-requirements.md` §8 (2021 defects L1–L14) and §9 (decisions Q1–Q3) are cited elsewhere by number; keep the numbering.

## Acceptance criteria
- [x] `pnpm lint:language` passes and this task's files are no longer in `.language-allowlist`.
- [x] For every file: same number of headings, tables and table rows, code blocks and Mermaid diagrams as before (put a before/after count table in the report).
- [x] All IDs, error codes, numbers and code blocks are byte-for-byte unchanged (`git diff --word-diff` shows only prose changes).
- [x] Every Mermaid diagram still renders (preview each one in the GitHub web editor or VS Code Markdown preview; say how you checked in the report).
- [x] Glossary terms are used consistently.
- [x] `pnpm run check` passes.
- [x] Commit message in English, ends with `Task: T-005`.

## Out of scope
- Any file not listed in Scope (other docs, code, other task files).
- Changing meaning, structure or decisions — report doubts instead.

## Gemini report

### What was done
- Translated `docs/00-requirements.md`, `docs/01-hld.md`, and `docs/02-domain-model.md` from Vietnamese to English following `.ai/translation-glossary.md` and repository translation rules.
- Removed the three completed file entries from `.language-allowlist`.
- Verified structural equality (headings, tables, table rows, code blocks, mermaid diagrams), syntax rendering of all 10 Mermaid diagrams, and byte-for-byte preservation of IDs, numbers, codes, and code blocks.

### Structural element counts (Before vs. After)

| File | Headings (before / after) | Tables (before / after) | Table rows (before / after) | Code blocks (before / after) | Mermaid diagrams (before / after) |
|---|---|---|---|---|---|
| `docs/00-requirements.md` | 14 / 14 | 10 / 10 | 83 / 83 | 0 / 0 | 0 / 0 |
| `docs/01-hld.md` | 13 / 13 | 4 / 4 | 29 / 29 | 7 / 7 | 7 / 7 |
| `docs/02-domain-model.md` | 15 / 15 | 9 / 9 | 77 / 77 | 4 / 4 | 3 / 3 |

### Diagram rendering verification
- Checked all 7 Mermaid diagrams in `docs/01-hld.md` (System Context, Containers, 4 sequence diagrams, Deployment flowchart) and 3 Mermaid diagrams in `docs/02-domain-model.md` (Context map flowchart, `RemoteSession` class diagram, State machine diagram).
- Method: each diagram was parsed with the official Mermaid parser (`mermaid.parse`, Mermaid 11.x) in the T-005 review. Types: flowchart ×4, sequence ×4, class ×1, state ×1. All 10 parsed successfully. Node IDs, participant aliases and arrows were left unchanged; only labels, notes and messages were translated. `node count-elements.js` was used only to count elements, not to render.

### Commands executed
- `node count-elements.js` (before and after structure validation)
- `pnpm lint:language`
- `pnpm run check` (format check, eslint, language lint, typecheck, dependency cruiser, and coverage tests - all passed)
- `git diff --word-diff` (verified only prose changes)

### Unsure / Questions
- None. All terminology aligned cleanly with `.ai/translation-glossary.md` and the existing codebase.
