---
name: tool-traps
description: "Use when writing or debugging shell commands, git searches, CI workflows, output-parsing one-liners, or YAML frontmatter in agent and skill files. A catalog of measured tool traps - silent zero-hit greps, swallowed exit codes, extractions that look like results - each with symptom, mechanism, verification date, and the guard against it."
---

# Tool traps — measured, dated, with the guard for each

Three rules for using this catalog:

1. **Every trap here was actually hit** — in a production agent-session corpus, on
   this maintainer's machine, or both. No brainstormed risks.
2. **Every trap carries a verification date and environment.** Tools change;
   a trap without a date is the next stale claim. If your version behaves
   differently, the catalog is wrong for you — re-verify, then rely.
3. **Being warned is not enough.** In the source corpus, two traps were hit
   *while the warning stood verbatim in the session's own brief*. The guard
   column exists because knowledge does not survive contact with autopilot;
   mechanical checks do.

Environment for the "verified locally" stamps below: macOS 26.0.1, git 2.50.1,
zsh 5.9 (arm64), bash 3.2.57, node 24.3.0, Claude Code 2.1.238 — 2026-08-21.

---

## Shell

## 1) zsh does not word-split unquoted variables — and a dead glob kills the whole line

**Symptom:** a `for f in $FILES` loop runs exactly once, with the whole list as
one item; numbers computed inside come out silently empty. Separately, one
unmatched glob (`no matches found`) aborts the entire command line, including
commands after it.

**Mechanism:** unlike bash, zsh performs no word-splitting on `$VAR` expansion,
and a glob with zero matches is a hard error, not an empty list.

**Verified locally 2026-08-21** (zsh 5.9): `for f in $VAR` → one item `[a b c]`
where bash yields three; `echo before; echo *.nomatch; echo after` → `after`
never prints. In the source corpus this combination let an `rm` behind a dead
glob silently not run, and a stray test file got committed.

**Guard:** use arrays (`for f in ${(f)$(...)}` or `while read`), quote
everything, and never hang a destructive or measuring command behind a glob in
the same line.

## 2) The exit code your harness sees is the last command's — usually the `echo`

**Symptom:** `npm run build > log 2>&1; echo "EXIT=$?"` prints the right
number, but the Bash tool, the CI step, and every wrapper judging the command
line see exit 0 — the `echo`'s.

**Mechanism:** `$?` inside the string is expanded correctly, but the command
*line's* status is the status of its last command. Related: a background run
piped through anything reports the pipe's exit code, not the command's.

**Verified locally 2026-08-21:** `zsh -c 'false; echo "EXIT=$?"'` prints
`EXIT=1` and exits 0. In the source corpus the harness recorded success while
the real code stood only in the log text.

**Guard:** let the measured command be the last thing on the line, or
`exit ${PIPESTATUS[0]}`-style explicitly. If you must print, print first,
judge second.

## 3) `2>/dev/null` on a measurement swallows the fact that it failed

**Symptom:** a search "returns zero hits" — actually it returned a usage
error you threw away. Cousin: `head`/`tail` on a measurement silently
truncates reality.

**Mechanism:** discarded stderr converts "the command was wrong" into "the
answer is zero". In the source corpus, `git grep -l PATTERN --untracked` with
the flag after the pattern errored — read as "no matches"; and a `head -12`
turned a measured "9 of 26" into a reported "11 of 25".

**Guard:** never attach `2>/dev/null`, `head`, or `tail` to a command whose
output decides anything. Read the failure; it is data.

## 4) An extraction that failed looks exactly like a result

**Symptom:** a `sed`/`awk` range extraction produces an empty (or wrong-slice)
file, exit code 0 — and the pipeline continues happily on nothing.

**Mechanism:** an address range that never matches selects nothing; that is
not an error to the tool.

**Verified locally 2026-08-21:** `sed -n '/A/,/B/p' file > out` with absent
markers → exit 0, 0 bytes. In the source corpus this was caught only because
the extraction reported its size.

**Guard:** every extraction reports its size (`wc -c < out`) and the consumer
checks it against a floor. Zero bytes is a verdict, not a result.

---

## git

## 5) `git grep -E` is POSIX ERE — `\s`, `\b`, `\d` silently match nothing

**Symptom:** a perfectly reasonable-looking `git grep -E 'foo\s*\('` finds
zero hits in a repo full of them. A check built on it stays green forever.

**Mechanism:** POSIX ERE has no PCRE escapes; use `[[:space:]]`,
`[[:digit:]]`, or `git grep -P` where available. Second trap at the same
tool: `git grep` exits 1 on zero matches — inside `execFileSync` or `set -e`
that *throws*, and your check reports "command failed" instead of a count.

**Verified locally 2026-08-21** (git 2.50.1): `git grep -E 'hello\sworld'` →
0 hits, exit 1; `[[:space:]]` → hit. In the source corpus a new guard
searched call sites with `\b…\s*\(` and reported *every* module clean —
while the warning about exactly this stood in the session's brief.

**Guard:** POSIX classes only (or `-P`); treat exit 1 as "zero matches", not
as failure; and give every new negative check a counter-test that must fail
(plant one match, expect red).

## 6) `git grep` without `--untracked` cannot see the files you just created

**Symptom:** a freshly generated module is reported dead / absent; locally
red, in CI green — or the reverse.

**Mechanism:** `git grep` searches tracked content only. The files a
refactor just created are exactly the ones it will not see. Corollary: a
scan over `src/` proves absence *in `src/`* — a library adapter in
`node_modules` writing to the same table is outside every repo grep.

**Measured in the source corpus** (2026-08): two live modules reported dead
because not yet committed.

**Guard:** `--untracked` when the work tree is the subject; and name the
search surface in the check's output ("searched: src, services") so a too-
narrow surface is visible instead of implied.

---

## Parsing tool output

## 7) Success-counting regexes miss the failure form

**Symptom:** a pipeline counts `Tests  16 passed` and silently extracts
nothing from `Tests  1 failed | 16 passed` — precisely for the runs that are
rightfully red.

**Mechanism:** the success line's shape changes when failures appear; a
pattern written against the green form matches only green runs.

**Measured in the source corpus** (2026-08): a gate metric came back empty
exactly on failing runs; the fix was counting the `failed` form first.

**Guard:** write the pattern against the failure form first, the success
form second — and counter-test the parser on a deliberately red run.

## 8) ANSI color codes defeat your grep on tool output

**Symptom:** `astro check`, and other tools that color their output, contain
` - error ` to the eye — and `grep -E ' - error '` finds nothing, so the
diff of error lists stays empty while the total rises.

**Mechanism:** the matched words are interleaved with escape sequences
(`\e[31m` …) in the byte stream.

**Measured in the source corpus** (2026-08). Second-order trap found there
too: diffing error lists *with line numbers* measures code shifts, not new
errors (measured once: "20 new" = 17 shifted + 3 real).

**Guard:** strip escapes before parsing (`perl -pe 's/\e\[[0-9;]*m//g'`),
and diff without line numbers.

## 9) A test runner's JSON can say `success: true` while the process exits 1

**Symptom:** your automation reads the reporter's `success` field and
proceeds; the run actually failed.

**Mechanism:** unhandled errors *outside* test cases ("Errors: N error")
fail the process but are not test failures — in the measured case the JSON
still carried `numFailedTests: 0, success: true` at exit 1.

**Measured in the source corpus** (2026-08, vitest, reproduced there in an
isolated project). **Version note, measured 2026-08-21 on vitest 4.1.11:**
the same probe (import-time throw) now yields `success: false` — and a
post-test async throw vanished entirely at exit 0. The specific behavior
moves between versions; the trap class stays.

**Guard:** the process exit code outranks any reporter field. Read both;
alarm on disagreement — that disagreement is the trap firing.

---

## CI

## 10) GitHub Actions `paths:` filters run per push, not per commit

**Symptom:** you compute "which commits should have triggered CI" from
`git log --name-only` and get a number wildly off reality; a docs-only push
gets no run at all even though code commits earlier that day did.

**Mechanism:** the filter is evaluated against the union of files changed in
the whole push. A push whose commits are all-docs triggers nothing — and the
end-of-session docs push is exactly that.

**Measured in the source corpus** (2026-08, over 11 days, `gh run list`
against 157 pushes): computing runs from per-commit paths was off by a
factor of ~20; 98 of 157 pushes (62 %) triggered no run under a filtered
workflow — ten of them the session-closing docs pushes.

**Guard:** for gate workflows: no `paths:` filter (run always, keep the jobs
cheap). Measure what actually ran with `gh run list`, never with `git log`
arithmetic.

---

## Claude Code harness

## 11) A `: ` inside an unquoted YAML value is a hard parse error — the file just never loads

**Symptom:** an agent or skill definition "looks right" but is never
available ("Agent type not found"; a skill that never triggers).

**Mechanism:** `description: Use when: always` is an illegal nested mapping
("mapping values are not allowed in this context"). The file fails to parse;
nothing warns at write time.

**Verified locally 2026-08-21** (Psych/YAML): hard SyntaxError. Measured in
the source corpus on two agent definitions (js-yaml) — both would silently
not have loaded. This file's own frontmatter quotes its description for
exactly this reason.

**Guard:** quote every frontmatter value that contains a colon; parse the
file once (any YAML parser) before shipping it.

## 12) New agent definitions take effect at the NEXT session, not this one

**Symptom:** a session writes `.claude/agents/reviewer.md` and immediately
gets "Agent type not found" when invoking it.

**Mechanism:** agent definitions are discovered at session start; a
directory that did not exist then is not consulted mid-session. Validation
tools check syntax, not availability.

**Measured in the source corpus** (2026-08).

**Guard:** create definitions in session N, use them from session N+1 — and
have the brief for N+1 name them explicitly (in the measured corpus, offered-
but-unnamed artifacts were used 0 out of 2 times).

## 13) Auto-memory is silently truncated — 200 lines, then 25,000 characters

**Symptom:** facts your sessions saved to MEMORY.md stop appearing in
context; nothing announces the cut.

**Mechanism:** at load, MEMORY.md is truncated to 200 lines first, then to
25,000 *characters* (UTF-16 units; the tool's internal name for it says
"bytes" — measured to be characters) at the last line boundary. The excess
is dropped silently. A warning fires at 80 % of either limit — if something
surfaces it.

**Measured in the source corpus** (extracted from the Claude Code binary
v2.1.237 and observed in operation: an index at quota 0.885 was already
losing content).

**Guard:** treat MEMORY.md as an index of one-line pointers, never as
storage; check `wc -lc` against 200/25,000 in a routine gate; compact at
80 %.

---

## Building your own checks

## 14) A regex reading source code cannot tell comments from comment-lookalikes

**Symptom:** a text-based check (dead-code scan, call-site counter) is
confidently wrong: a `/*` inside a string, a line comment, or rendered
documentation text opens a "block comment" that swallows hundreds of real
lines — a positive check goes red, a *negative* check stays silently green.

**Mechanism:** comment syntax is context-dependent; regexes have no context.
String literals keep symbol names alive for naive matchers, and prose
examples in docs contain code-shaped text.

**Measured in the source corpus** (2026-08, repo-wide): 174 pseudo-comment
false openings, 41 with damage, 5,874 swallowed lines, worst case 454 lines.
A follow-up quick fix — splitting lines at `//` — also cut every `https://`
URL: 575,353 characters across 1,255 files.

**Guard:** parse regions (comments, strings) before matching, or use a
parser-backed tool; pass the file path so the parser knows the language; and
give every negative check its counter-test (plant a hit, expect red).
