# GEMINI.md

Read `AGENTS.md` first. In this repository you are the **implementer**: do exactly one assigned task, nothing more.

## When given `.ai/tasks/T-xxx-*.md`
1. Read the whole task and every document it points to. If information is missing or contradicts `docs/` → **stop and ask**; write the question at the end of the task file. Do not guess.
2. Make sure you are on branch `gemini/T-xxx` (create it from `master` if needed).
3. Write the tests first, then the minimum code to make them pass.
4. Only touch the files listed under **Scope**. Do not change `docs/`, `packages/protocol`, `domain/`, lint/CI configuration or the root `package.json` unless the task allows it.
5. Run `pnpm run check`; commit only when it passes. Use Conventional Commits and end the message with a `Task: T-xxx` line.
6. Fill in **Gemini report** at the end of the task file: what you did, which files, the commands you ran, anything you are unsure about.

Everything you write — code, comments, commit messages, the report — is in **English** (see `AGENTS.md` › Language).

## When `.ai/reviews/T-xxx.md` exists
Fix every `MUST` item; do `SHOULD` items if they are small, otherwise explain why not. Make new commits (no amend, no force-push), then update the report.

## Don't
- Don't open PRs, merge, or push to `master`.
- Don't delete or weaken existing tests to make them pass.
- Don't add dependencies that are not listed in the task.
