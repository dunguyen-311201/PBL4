# AI workflow: Claude plans & reviews, Gemini implements

Goal: hand small, well-specified tasks to Gemini (Antigravity CLI) to save Claude's tokens, while keeping quality through review and CI. A human (`dunguyen-311201`) always merges.

## Roles

| Who | Does | Does not |
|---|---|---|
| **Claude** | Splits work, writes tasks, does the sensitive parts, reviews results | Approve/merge |
| **Gemini** (Antigravity `agy`) | Exactly one task: tests → code → `pnpm run check` → commit | Change the design, touch files outside scope, open PRs, merge |
| **Maintainer** | Runs `agy`, pushes, opens PRs, merges | — |

**Given to Gemini:** simple adapters with a clear contract (port already exists), extra tests, package READMEs, UI from a mockup, small refactors, translation.
**Kept by Claude:** design, ADRs, domain, concurrency (Lua, scheduler), authentication/JWT/security, protocol, anything that needs a decision.

## The loop

```mermaid
sequenceDiagram
    participant C as Claude
    participant U as Maintainer
    participant G as Gemini (agy)
    C->>C: write .ai/tasks/T-xxx.md (status: ready)
    U->>G: git switch -c gemini/T-xxx master; agy "Do .ai/tasks/T-xxx..."
    G->>G: tests → code → pnpm run check → commit
    U->>C: "review T-xxx"
    C->>C: diff + CI on a clean clone + check every criterion
    C->>C: write .ai/reviews/T-xxx.md
    alt Changes needed
        U->>G: agy "Address .ai/reviews/T-xxx.md"
    else Ready
        U->>U: push, open PR, merge
    end
```

## Commands for the maintainer

```powershell
# once
irm https://antigravity.google/cli/install.ps1 | iex
agy            # sign in with the Google account

# per task (create the task branch from the branch that contains the task file)
git switch master; git pull
git switch -c gemini/T-005
agy            # then type: Do .ai/tasks/T-005-translate-core-docs.md
```

Prefer interactive mode (`agy`) and review each change before allowing it. Non-interactive mode (`agy -p "..."`) blocks shell commands until they are granted, so Gemini cannot run `pnpm run check` on its own. Start a fresh `agy` session per task; long sessions use up the quota faster.

When Gemini has committed, tell Claude **"review T-005"**.

## Formats

- **Task** (`.ai/tasks/T-xxx-<name>.md`): follows [`TEMPLATE.md`](../.ai/tasks/TEMPLATE.md) — goal, read-first, file scope, allowed dependencies, contract, checkable acceptance criteria, required tests, out of scope.
- **Review** (`.ai/reviews/T-xxx.md`): verdict (`READY_FOR_HUMAN` / `CHANGES_REQUESTED`), CI on a clean clone, each criterion checked, `MUST` / `SHOULD` / `NIT` items with file:line.
- Task status at the top of the file: `ready` → `in-progress` → `in-review` → `done` (or `on-hold`).
- All task and review files are written in English.

## What Claude checks in a review
1. Full CI on a clean clone of the branch (never trust "already ran it").
2. Every acceptance criterion — is there a test or command that proves it?
3. The diff stays within the task's scope; no existing test changed or removed; no unlisted dependency.
4. `AGENTS.md` rules: dependency layers, no secrets in logs, no `any`, names follow the ubiquitous language, English only.
5. Tests check real behaviour (not just coverage) and include failure cases.
6. For adapters with real I/O or cost (hashing, network, storage): an end-to-end check with the real implementation, not only fakes.
