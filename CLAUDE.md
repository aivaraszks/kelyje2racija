# racija

Web application developed with Claude Code by a team of subagents.

## Tech stack

Not chosen yet. Once decided, record here: framework, language, package manager, backend, database, and the commands for dev server, build, test and format.

## Dev team (subagents in `.claude/agents/`)

| Agent           | Role                                                | Writes to                     |
| --------------- | --------------------------------------------------- | ----------------------------- |
| `architect`     | Plans features, splits tasks, records decisions     | `docs/plans/`                 |
| `ux-expert`     | User flows, screens, states, copy, accessibility    | `docs/ux/`                    |
| `designer`      | Design system, tokens, visual component specs       | `docs/design/`, global styles |
| `frontend-dev`  | Implements UI                                       | frontend code                 |
| `backend-dev`   | Implements API, logic, database                     | backend code                  |
| `tester`        | Writes missing tests, runs the suite, checks "done" | test files                    |
| `code-reviewer` | Reviews the diff for bugs, security, conventions    | nothing (read-only)           |

## Workflow — the main session orchestrates

For any non-trivial feature, the main session delegates in this order and reports to the user between phases:

1. **Clarify** — ask the user for missing details (see `.claude/rules/ask-for-details.md`).
2. **Plan** — `architect` writes `docs/plans/<feature>.md`. Show the plan to the user and wait for approval.
3. **Spec** — for UI work, `ux-expert` writes the UX spec, then `designer` adds/updates tokens and visual specs. Skip for backend-only work.
4. **Build** — `backend-dev` and `frontend-dev` implement their tasks. Run them in parallel when the plan's API contract is fixed; otherwise backend first.
5. **Test** — `tester` adds missing tests and runs the full suite. Failures go back to the responsible developer.
6. **Review** — `code-reviewer` reviews the diff; `ux-expert` reviews built UI. Fixes go back to the developer, then re-test.
7. **Report** — summarise to the user what was built, test results and open issues. Commit only when the user asks.

Small, clear tasks (a fix, a rename, one file) skip the pipeline — do them directly.

Agents hand work to each other through files in `docs/` — always pass the relevant plan/spec path when delegating.
