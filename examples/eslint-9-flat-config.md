<!--
  WORKED EXAMPLE - a session brief filled in for a realistic task on a
  neutral subject: migrating a mid-size TypeScript repository from ESLint 8
  (.eslintrc) to ESLint 9 (flat config).

  This example is illustrative. Values marked (example) show what a real
  brief carries at that spot - replace them with numbers measured on your
  repository. The commands are real; run them. The traps listed are real
  ESLint 9 behavior, stated conservatively - verify them against your own
  versions, which is the point of the method.
-->

---
status: "open"
created: "2026-08-21"
chain: "LINT9"
this: "LINT9-1"
predecessor-result: "none - first brief"
successor: "to be written by this session at the end of its run"
---

# BRIEF LINT9-1 — ESLint 8 → 9, flat config, parity first

**Size: M.** One session, one deliverable: the repo lints under ESLint 9
flat config with documented rule parity. Plugin major upgrades are half B
(see the planned cut).

## Read first

1. `package.json` — current eslint + plugin versions (measure, do not assume)
2. `.eslintrc.cjs`, `.eslintignore` — the legacy config being replaced
3. https://eslint.org/docs/latest/use/configure/migration-guide — the
   official migration guide; where this brief and the guide conflict, the
   guide wins and the brief gets corrected in your result report

## What this is — and what it is not

**Is:** a mechanical migration to flat config with rule parity. The
deliverable is a repo that lints the same files with the same effective
rules, on ESLint 9, in CI.

**Is not:** a lint-policy redesign. New rules, stricter settings and
auto-fix sweeps are tempting, adjacent, and not this session.

## The one sentence

> The same files, the same effective rules — only the config format changes.

**Its test:** the file list and the effective rule set, dumped before and
after, diff empty (modulo documented, justified exceptions).

## Measured starting state

| What | Value | Measured with | Date |
|---|---|---|---|
| eslint version | 8.57.0 (example) | `npx eslint --version` | 2026-08-21 |
| files linted | 412 (example) | `npx eslint . --format json \| node -e '...count...'` | 2026-08-21 |
| lint errors on main | 0 (example: must be 0 before you start) | `npx eslint .` | 2026-08-21 |
| effective rules for one representative file | 143 (example) | `npx eslint --print-config src/index.ts \| node -e '...count keys...'` | 2026-08-21 |

**Re-measure before you rely on it.** A migration on top of a dirty baseline
cannot tell its own breakage from pre-existing breakage.

## Owner decisions — fixed, not up for debate

| Question | Decision | Reason |
|---|---|---|
| Parity or modernization? | Parity. | Two changes in one diff cannot be reviewed. |
| Formatting rules that ESLint 9 dropped? | Keep via @stylistic only if they were active before; otherwise drop and document. | Parity, not archaeology. |
| Legacy shareable configs without flat support? | Bridge with FlatCompat from @eslint/eslintrc; removal is half B. | One new mechanism per session. |

**Default for new questions:** decide with reasons, implement, document in
the result report. Do not stop to ask.

## The mission

1. Add `eslint.config.mjs` reproducing the effective legacy config
   (FlatCompat where a shareable config has no flat version yet).
2. Move `.eslintignore` patterns into `ignores` — the file itself stops
   working under flat config (trap 1).
3. Replace `env:` blocks with `languageOptions.globals` (trap 2).
4. Update the lint scripts and CI: no `--ext` under flat config (trap 3).
5. Remove the legacy config files in the same commit that proves parity.
6. Dump before/after effective config for the representative files and
   commit the diff as `docs/lint9-parity.md`.

## Non-goals — each with its reason

| Do not | Why |
|---|---|
| Fix new findings that appear during migration | They mean parity was NOT reached: that is a config bug to fix, or a documented exception. Fixing code hides the config bug. |
| Upgrade plugin majors "while we are at it" | Separate failure surface, separate session (half B). |
| Adopt a new style preset | Policy change, owner decision, not commissioned. |

**Parked, not commissioned:** typescript-eslint strict preset looked
attractive during the spike — parked for a policy discussion, not built.

## Known traps

All hit during the spike for this migration (illustrative here; your spike
will produce your list):

1. **`.eslintignore` is silently ignored under flat config.** The lint run
   then covers MORE files than before, and "new errors" appear that are
   really just newly covered old files. Guard: compare linted-file counts
   first, before reading a single finding.
2. **`env: { node: true }` does not exist in flat config.** Without
   `languageOptions.globals`, `process` and friends become `no-undef`
   errors. Guard: the parity diff catches it as a rule-input change.
3. **`--ext` does nothing under flat config.** File selection lives in
   `files:` patterns now; a CI script that passes `--ext .ts` quietly lints
   a different set. Guard: the file-count comparison again.
4. **Two config systems can be active during the transition.** ESLint 9
   picks flat config when `eslint.config.*` exists; an old `.eslintrc.cjs`
   lying around is dead weight that LOOKS load-bearing. Remove it in the
   parity commit, not "later".

(Tool-level traps — zero-hit greps, swallowed exit codes — are covered by
the tool-traps skill; install it instead of restating it here.)

## Guardrails

- **Evidence duty.** Every count in the result report carries its command.
- **A green lint run is not a "done" claim.** Open the parity diff and read
  it. A parity diff nobody read is a claim, not a deliverable.

## The planned cut

- **The seam:** half A — flat config with FlatCompat bridges, full parity,
  legacy files removed. Half B — replace each FlatCompat bridge with the
  plugin's native flat config, plugin upgrades where required.
- **The trigger:** more than half the context window spent when half A is
  green: cut.
- **What half A must be when you cut:** linting green in CI, parity diff
  committed, result report written.
- **What happens to half B:** its own brief, LINT9-1b, written by you,
  listing every remaining FlatCompat bridge by name.

## Gate

1. `npx eslint .` exits 0 on the migrated config — exactly 0 errors.
2. Linted-file count after == before (example: 412 == 412), same command.
3. Effective-rule diff for the representative files: empty, or every line
   explained in `docs/lint9-parity.md`.
4. CI runs the new lint script and is green.
5. The parity guard got its counter-test: break one rule on purpose in a
   scratch file, and the run must go red. A guard without a counter-test is
   a claim.

## Completion

Result report with: after-state table (re-measured), autonomous decisions
with reasons, corrected inherited numbers, new traps with mechanisms, what
argues against the result (e.g., "parity proven only for representative
files, not all 412") — and the next brief (LINT9-1b or LINT9-2) as a file
and a copy-ready start block.
