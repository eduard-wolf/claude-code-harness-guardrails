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
   differently, the catalog is wrong for you: re-verify, then rely on it. In
   the repository this catalog ships from, CI re-runs, on every push, every
   trap it can put a probe behind, the trap form first and then the remedy
   the entry prescribes, and names the rest by number, with the reason. Its
   output, not this date, tells you which of these entries were measured
   most recently and on what.
3. **Being warned is not enough.** In the source corpus, two traps were hit
   *while the session's own brief carried the warning word for word*. The
   guard line exists because knowledge does not survive contact with
   autopilot; mechanical checks do.

Environment for the "verified locally" stamps below, unless an entry states
its own: macOS 26.0.1, git 2.50.1,
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
never prints. In a non-interactive zsh *script* it is worse, not gentler:
the failed glob aborts the whole file; in the measurement the next line
never ran and the script exited 1. In the source corpus this combination let an `rm`
behind a dead glob silently fail to run, and a stray test file got
committed.

**Guard:** use arrays (`for f in ${(f)"$(...)"}` or `while read`), quote
everything, and never put a destructive or measuring command after a glob on
the same line.

## 2) The exit code your harness sees is the last command's — usually the `echo`

**Symptom:** `npm run build > log 2>&1; echo "EXIT=$?"` prints the right
number, but the Bash tool, the CI step, and every wrapper judging the command
line see exit 0 — the `echo`'s.

**Mechanism:** `$?` inside the string is expanded correctly, but the command
*line's* status is the status of its last command. Related: a run piped
through anything (`| tee log`) reports the pipe's exit code, not the
command's.

**Verified locally 2026-08-21:** `zsh -c 'false; echo "EXIT=$?"'` prints
`EXIT=1` and exits 0. In the source corpus the harness recorded success while
the real exit code existed only in the log text.

**Guard:** let the measured command be the last thing on the line, or run
under `set -o pipefail` so the pipeline reports the failure. If you read a
stage's code explicitly, mind the shell: bash has `${PIPESTATUS[0]}`, zsh has
`$pipestatus[1]` — the bash form expands to *empty* in zsh, and `exit` with
an empty argument silently keeps the previous status. (Verified 2026-08-21,
zsh 5.9: `false | cat; exit ${PIPESTATUS[0]}` exits 0, bash exits 1,
`pipefail` exits 1. The first published version of this very guard
recommended the bash form under a zsh stamp — a reviewer caught the guard
re-building the trap it teaches.) If you must print, print first, judge
second.

## 3) `2>/dev/null` on a measurement swallows the fact that it failed

**Symptom:** a search "returns zero hits"; what it actually returned was a
usage error you threw away. Cousin: `head`/`tail` on a measurement
silently truncates reality.

**Mechanism:** discarded stderr converts "the command was wrong" into "the
answer is zero." In the source corpus, `git grep -l PATTERN --untracked`
with the flag after the pattern errored and was read as "no matches"; and a
`head -12` turned a measured "9 of 26" into a reported "11 of 25".

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

## 5) `git grep -E` is the platform's ERE, not just POSIX — `\d` matches nothing, `\s` and `\b` change with the host

**Symptom:** a perfectly reasonable-looking `git grep -E 'foo\s*\('` finds
zero hits in a repo full of them, and a check built on it stays green
forever. The nastier shape: it works on the machine it was written on and
finds nothing on the machine it runs on, or the reverse.

**Mechanism:** `git grep -E` does not stop at POSIX ERE; it hands the
pattern to the platform's regex library. glibc's carries the GNU operators
`\s`, `\b`, and `\w`; the BSD one on macOS does not, and `\d` is an
operator in neither. Use `[[:space:]]`, `[[:digit:]]`, or `git grep -P` where
it exists. Second trap in the same tool: `git grep` exits 1 on zero
matches, which *throws* inside `execFileSync` or under `set -e`, so your
check reports "command failed" instead of a count.

**Verified locally 2026-08-21** (macOS, git 2.50.1): `git grep -E
'hello\sworld'` → 0 hits, exit 1; `[[:space:]]` → hit. In the source corpus
a new guard searched call sites with `\b…\s*\(` and reported *every* module
clean, while the brief for that session carried the warning about exactly
this.

**Re-measured in CI 2026-08-24** (ubuntu-latest, Linux 6.17, git 2.55.0,
glibc), over the same fixture: `\s` → 1 hit, exit 0, and `\b` → 1 hit, exit
0, while `\d` → 0 hits, exit 1. The first published version of this entry
called all three "silently match nothing": true where it had been measured,
false one runner away. This repository's own verify-traps guard found that
on its second run against a host the entry was not written on; the first
run aborted inside its own self-test and printed nothing. Dating these
stamps and re-running them is the whole argument.

**Guard:** POSIX classes only (or `-P`); treat exit 1 as "zero matches", not
as failure; and give every new negative check a counter-test that must fail
(plant one match, expect red).

## 6) `git grep` without `--untracked` cannot see the files you just created

**Symptom:** a freshly generated module is reported dead or absent; red
locally, green in CI, or the reverse.

**Mechanism:** `git grep` searches tracked content only. The files a
refactor just created are exactly the ones it will not see. Corollary: a
scan over `src/` proves absence *in `src/`* — a library adapter in
`node_modules` writing to the same table is outside every repo grep.

**Measured in the source corpus** (2026-08): two live modules reported dead
because not yet committed.

**Guard:** `--untracked` when the work tree is the subject; and name the
search surface in the check's output ("searched: src, services") so a
too-narrow surface is visible instead of implied.

---

## Parsing tool output

## 7) Success-counting regexes miss the failure form

**Symptom:** a pipeline counts `Tests  16 passed` and silently extracts
nothing from `Tests  1 failed | 16 passed`, precisely for the runs that are
rightly red.

**Mechanism:** the success line's shape changes when failures appear; a
pattern written against the green form matches only green runs.

**Measured in the source corpus** (2026-08): a gate metric came back empty
exactly on failing runs; the fix was counting the `failed` form first.

**Guard:** write the pattern against the failure form first, the success
form second — and counter-test the parser on a deliberately red run.

## 8) ANSI color codes defeat your grep on tool output

**Symptom:** `astro check`, and other tools that color their output,
visibly contain ` - error `, yet `grep -E ' - error '` finds nothing, so
the diff of error lists stays empty while the total rises.

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

**Guard:** the process exit code outranks any reporter field. Read both and
alert on disagreement: that disagreement is the trap firing.

---

## CI

## 10) GitHub Actions `paths:` filters run per push, not per commit

**Symptom:** you compute "which commits should have triggered CI" from
`git log --name-only` and get a number wildly at odds with reality; a docs-only
push gets no run at all even though code commits earlier that day did.

**Mechanism:** the filter is evaluated against the union of files changed in
the whole push. A push whose commits are all-docs triggers nothing, and the
end-of-session docs push is exactly that.

**Measured in the source corpus** (2026-08, over 11 days, `gh run list`
against 157 pushes): computing runs from per-commit paths was off by a
factor of ~20; 98 of 157 pushes (62%) triggered no run under a filtered
workflow, 10 of them the session-closing docs pushes.

**Guard:** for gate workflows, no `paths:` filter (always run, and keep the
jobs cheap). Measure what actually ran with `gh run list`, never with
`git log` arithmetic.

---

## Claude Code harness

## 11) A `: ` inside an unquoted YAML value is a hard parse error — and each artifact fails differently

**Symptom:** an agent or skill definition "looks right" but misbehaves. An
*agent* is simply gone ("Agent type not found"). A *skill* is sneakier: it
works when invoked by hand and never triggers automatically.

**Mechanism:** `description: Use when: always` is an illegal nested mapping
("mapping values are not allowed in this context"), and nothing warns at
write time. The two artifact types then fail in opposite ways, both per the
official docs (code.claude.com/docs, checked 2026-08-21). A subagent file
with broken YAML is skipped entirely: "Claude Code reads no fields from the
file, skips it." A SKILL.md with malformed frontmatter instead "loads the
skill body with empty metadata, so `/skill-name` still works but Claude has
no `description` to match against" — alive under manual test, dead in the
mode that matters.

**Verified locally 2026-08-21** (Psych/YAML): hard SyntaxError. Measured in
the source corpus on two agent definitions (js-yaml); both would have
silently failed to load. This file's own frontmatter quotes its description
for exactly this reason.

**Guard:** quote every frontmatter value that contains a colon; parse the
file once (any YAML parser) before shipping it; for skills, test the
*automatic* trigger, not just the slash command. `--debug` shows the parse
error.

## 12) An agents directory created mid-session stays invisible until the next start

**Symptom:** a session creates `.claude/agents/` (which did not exist when
the session started), writes `reviewer.md` into it, and gets "Agent type
not found" when invoking it.

**Mechanism:** the file watcher covers only directories that existed at
session start. Edits to files under an already-watched directory hot-reload
"within a few seconds […] with no restart needed" (official docs). The trap
is specifically the *first* agent file in a *new* directory: "a running
session doesn't detect a newly created `agents` directory." Validation tools
check syntax, not availability.

**Measured in the source corpus** (2026-08); both halves confirmed against
code.claude.com/docs/en/sub-agents, checked 2026-08-21. (The first published
version of this trap over-generalized to "all new definitions need a new
session", and was narrowed after review.)

**Guard:** create the agents directory once, before you need it; after
writing a scope's first agent file into a new directory, restart. And have
the next brief name the new agents explicitly — in the source corpus,
offered-but-unnamed artifacts were used 0 out of 2 times.

## 13) Auto-memory is silently truncated — 200 lines, then 25,000 characters

**Symptom:** facts your sessions saved to MEMORY.md stop appearing in
context; nothing announces the cut.

**Mechanism:** at load, MEMORY.md is truncated to 200 lines first, then to
25,000 *characters* (UTF-16 units) at the last line boundary. The excess is
dropped silently. A warning fires at 80% of either limit — assuming
something surfaces it. Note the unit collision: the official docs state the
cap as "the first 25KB", and the tool's internal name for the limit says
bytes; the measured limit is 25,000 UTF-16 code units, which for any
non-ASCII content is not the same thing.

**Measured in the source corpus** (extracted from the Claude Code binary
v2.1.237 and observed in operation: an index at 88.5% of quota was already
losing content).

**Guard:** treat MEMORY.md as an index of one-line pointers, never as
storage; check `wc -lc` against 200/25,000 in a routine gate; compact at
80%.

## 14) In a Claude Code shell, `grep` and `rg` are not the system tools

**Symptom (a), the order:** a verification reads `grep -o PATTERN a.md
b.md` positionally ("the first eight lines are `a.md`") and silently
attributes half its findings to the wrong file. Every matched line is
correct; only the grouping is wrong, and it changes between identical runs
of the same command line.

**Symptom (b), the reach:** `grep -r PATTERN .` reports absence for a file
that is sitting right there. Everything a `.gitignore` covers is invisible
to it, and so is everything under `.git/`. A search meant to prove "this
string appears nowhere" proves it only for the part of the tree the
wrapper decided to walk. It reports that partial absence with exit 1, the
same exit it gives when the string genuinely appears nowhere.

**Mechanism:** both names resolve to shell functions from the session's
shell snapshot rather than to the system tools; they run the search engines
embedded in the Claude Code binary (`ARGV0=ugrep claude -G …`,
`ARGV0=rg claude …`). `type -f grep` prints the function body in zsh, and
`type grep` does it in bash; `which ugrep` finds no binary at all. The two
functions are not alike. The `grep` one puts flags of its own in front of
your arguments: `--ignore-files --hidden -I --exclude-dir=.git`, plus one
exclusion per additional VCS directory. `--ignore-files` applies every `.gitignore` it finds, with no
git repository required for it to take effect, and `--exclude-dir=.git`
drops the repository's own files; only `--hidden` runs the other way,
putting dotfiles back in, which is where the system `grep -r` has them
anyway. The `rg` function forwards your arguments unchanged, and exists
only on a host without a ripgrep of its own, though ripgrep's defaults skip
ignored and hidden files in any case. Symptom (b) was measured on `grep`
only. Nothing here governs order; `-J1` (one worker) makes
the order stable, so the engines evidently walk several files at once and
print each file's block once that file is finished: the order follows
completion, not the command line.

**Verified locally 2026-08-24** (Claude Code 2.1.241, zsh 5.9, macOS
26.0.1), symptom (a): 10 identical runs of `grep -o 'section: [a-z-]*'
README.md README.de.md` printed the *second* file's block first in 4 of
10; the same 10 runs under `rg`, in 5 of 10. Blocks stayed contiguous in
all 20 runs; only their order moved. 10 runs each of
`command -p grep`, `grep -J1` and `rg --sort path` held argument order 10
of 10, re-checked with the arguments swapped. For this pair argument order
is not alphabetical order, so `--sort path` bought determinism, not
sorting. The trap hit the baseline
check of this repository's own session brief, where that same command line
sits in the starting-state table.

**Verified locally 2026-08-24** (same environment), symptom (b): a
throwaway directory that is not a git repository at all (it holds a
`.git/` with one file in it, but nothing git will open), a `.gitignore`
naming `ignored`, and one planted line in four files. `command -p grep -r`
found all four; the wrapper found two, missing `ignored/a.txt` and
`.git/config`, and both exited 0. With the line planted *only* in the
ignored file, the wrapper exited 1 and printed nothing while the system
tool printed the hit. The hidden file was found by both.

**Guard:** never read multi-file search output positionally. Search one
file per command, or group by the `file:` prefix these tools already print
when given more than one file; if a fixed order is required, use a flag
you have measured on your own version. When absence is the answer, run
`command -p grep`, which is the system tool with system semantics. And ask
any shell you are about to trust what its names resolve to (`type -f grep`
in zsh, `type grep` in bash): that answer is a measurement too.

---

## Building your own checks

## 15) A regex reading source code cannot tell comments from comment-lookalikes

**Symptom:** a text-based check (dead-code scan, call-site counter) is
confidently wrong: a `/*` inside a string, a line comment, or rendered
documentation text opens a "block comment" that swallows hundreds of real
lines — a positive check goes red, a *negative* check stays silently green.

**Mechanism:** comment syntax is context-dependent; regexes have no context.
String literals keep symbol names alive for naive matchers, and prose
examples in docs contain code-shaped text.

**Measured in the source corpus** (2026-08, repo-wide): 174 pseudo-comment
false openings, 41 causing damage, 5,874 swallowed lines, worst case 454
lines. A follow-up quick fix, splitting lines at `//`, also cut every
`https://` URL: 575,353 characters across 1,255 files.

**Guard:** parse regions (comments, strings) before matching, or use a
parser-backed tool; pass the file path so the parser knows the language; and
give every negative check its counter-test (plant a hit, expect red).
