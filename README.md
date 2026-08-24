English | [Deutsch](README.de.md)

# claude-code-harness-guardrails

[![guards](https://github.com/eduard-wolf/claude-code-harness-guardrails/actions/workflows/guards.yml/badge.svg)](https://github.com/eduard-wolf/claude-code-harness-guardrails/actions/workflows/guards.yml)

<!-- section: what -->
## What this is

When Claude Code sessions run long and autonomous, two things rot fastest:
the **numbers in your documents** and the **trust in your own checks**. This
repository ships the countermeasures for both, distilled from a production
corpus of 85 session briefs and 49 result reports:

- a **catalog of measured tool traps** — installable as a skill, so your
  sessions know them without re-learning them the expensive way;
- a **session-brief pattern** for long-running agent chains (a session brief
  is the document that starts one autonomous run — and is written by the run
  before it) — the ten parts that measurably carried weight, and the ones
  that turned out to be ritual;
- the **honest measurement** of what this method does and does not achieve.

The flavor of the whole catalog, in one line each:

```bash
git grep -E 'foo\s*\('        # silent zero hits on macOS, matches on glibc
false | cat; echo "EXIT=$?"   # prints 1 - and reports exit 0 to your harness
```

It is not a framework, not a turnkey harness, and not a promise that
everything gets better. It is not a permission firewall either: what it
guards against is being silently wrong — numbers that go stale unnoticed,
checks that quietly test nothing — not dangerous commands. It composes
with Anthropic's published harness patterns; it does not replace them.

<!-- section: quickstart -->
## Five minutes

Install the trap catalog as a skill (Claude Code ≥ 2.0):

```
/plugin marketplace add eduard-wolf/claude-code-harness-guardrails
/plugin install tool-traps@claude-code-harness-guardrails
```

Or copy it manually — it is a single Markdown file:

```bash
git clone https://github.com/eduard-wolf/claude-code-harness-guardrails
cp -r claude-code-harness-guardrails/plugin/skills/tool-traps ~/.claude/skills/
```

(The marketplace shorthand clones over SSH by default; without an SSH key,
set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` first. Project-local instead of
global: copy into the project's `.claude/skills/`.)

Outside Claude Code — any agent CLI:

```bash
npx skills add eduard-wolf/claude-code-harness-guardrails
```

That writes the catalog once to `.agents/skills/tool-traps/` and links it
into the per-agent directories the CLI supports, Claude Code among them
(verified 2026-08-24, skills CLI 1.5.23). It installs into the directory
you run it in: measured the same day in one with neither `.git` nor
`package.json`, it still landed in `./.agents/`. Use `-g` to install
globally instead. Traps 11 to 14<!-- trap-group: Claude Code harness = 11-14 -->
are the catalog's own "Claude Code harness" group and bound to this
harness; everything else in it is tool-level and agent-agnostic.

For the plugin route: `/plugin` lists `tool-traps` as installed. Then the
fun probe, for any route: ask the session to write a `git grep` with `\s`.
It should refuse and reach for `[[:space:]]`.

<!-- section: proof -->
## What we can prove — and what we can't

I measured the method on its own corpus before publishing it. What's proven
is one thing, narrow and useful: **a mechanical check catches a real error
class** — stale numbers in living documents. It caught four of them in CI
after a session had pushed them, and four more before a later push.

The headline measurement, by contrast, does **not** support the story you
would expect this README to tell:

> With n = 2 sessions after the harness optimization, no trend is provable —
> Welch's t ≈ 1.9, p ≈ 0.12 — and one session from *before* the optimization
> already beat both after-values.

Two honest limits on that number. It measures one harness optimization
*inside* the source project, not the trap catalog and not the brief pattern,
which rest on other measurements: the ritual findings, the 62% of pushes
that triggered no CI run, the overflow/planned-cut control pair. And the
statistic itself is a claim from the source corpus whose underlying series
was never persisted; the numbers page documents it as such. In the source
corpus's own words:

> "The net has become denser; the fish is not demonstrably bigger."
>
> "The red CI run proves compensation, not discipline."

The full numbers, their populations, and the drift found in this
repository's own commissioning brief while building it:
**[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md)**.

<!-- section: traps -->
## The trap catalog

**15**<!-- count:traps --> traps, in six<!-- count:trap-groups --> groups.
Every one actually hit, every one with symptom, mechanism, verification
date, and the guard against it. No brainstormed risks. Three samples:

- `description: Use when: always` is a hard YAML parse error. The agent is
  simply gone ("Agent type not found"); the skill turns zombie: alive
  under its slash command, dead in the automatic trigger. (Trap 11)<!-- trap-ref: 11 YAML -->
- An agents directory created *mid-session* stays invisible until the next
  start, because the file watcher covers only directories that existed at
  session start. The file is written, the agent is not found. (Trap 12)<!-- trap-ref: 12 agents -->
- Auto-memory (`MEMORY.md`) is silently truncated at 200 lines / 25,000
  characters. Measured, including the fact that the tool's internal name
  for the limit says "bytes" and means characters. (Trap 13)<!-- trap-ref: 13 memory -->

Knowing them is not the same as being safe from them: in the source
corpus, two of the catalog's traps were hit *while the warning sat
verbatim in the session's own brief*. Knowledge does not survive contact
with autopilot; mechanical checks do, which is why every entry here ends
in a guard, not in a reminder.

Full catalog (also the file the skill installs):
**[plugin/skills/tool-traps/SKILL.md](plugin/skills/tool-traps/SKILL.md)**.

<!-- section: briefs -->
## The session-brief pattern

The corpus converged on ten parts: lifecycle header · read-first list with
pre-resolved conflicts · the one sentence with its test · measured baseline
("re-measure your predecessor; if your number differs, yours wins, with
evidence") · owner decisions plus a decide-don't-stall default · non-goals
with reasons · trap catalog · **context budget with a named seam** ("a
planned cut is a clean delivery; running over is not") · gate with exact
numbers and counter-tested guards · completion protocol that ends with the
session writing the next brief.

The counterintuitive core, measured in the corpus: **the brief is a chain
output, not a human input.** Pre-written skeleton templates failed there:
not one was ever run as written, and each first had to be hand-expanded to
11 to 23 times its size. Briefs written by the outgoing session, while its
knowledge is fresh and measured, carried the chain. The
template here is a *seed* for the first brief, not a form to fill per
session.

- Template: **[template/session-brief.md](template/session-brief.md)**
- Worked example (ESLint 8→9 migration):
  **[examples/eslint-9-flat-config.md](examples/eslint-9-flat-config.md)**
- The pattern with its evidence, failure modes, and the comparison to
  Anthropic's harness posts: **[docs/method.md](docs/method.md)**

<!-- section: self-application -->
## This repository guards itself

Two language versions are two registers of the same content, and registers
drift. That is this repository's core subject, so it applies its own
method to itself, in CI, on every push:

- **[guards/check-readme-parity.mjs](guards/check-readme-parity.mjs)** —
  README.md and README.de.md must carry the same sections in the same
  order, checked via invisible section anchors rather than prose. That
  catches structural drift mechanically. Whether a translation stays
  *current* remains a manual duty, and saying so here is part of the
  method.
- **[guards/check-counts.mjs](guards/check-counts.mjs)** — every count
  *marked* for the guard in this README (like the trap count above) is
  re-measured against the artifact itself. No second register: the catalog
  is the only source of its own count. The same guard re-measures every
  trap reference here. A "(Trap 11)<!-- trap-ref: 11 YAML -->" has to still
  point at the entry it names, and a reference left unmarked is red as
  well, so renumbering the catalog cannot leave the prose quietly wrong.
  On top of that it holds one unmarked invariant: as many `**Guard:**`
  lines in the catalog as entries, which is what makes "every entry here
  ends in a guard" a measurement rather than a promise. The corpus figures
  (85 briefs, 262 files, line counts) are historical measurements with a
  date and no machine, deliberately unmarked, because no file in this
  repository can re-measure them.
- **[guards/verify-traps.mjs](guards/verify-traps.mjs)** — the dates on the
  trap catalog stop being a promise. On every push the runner re-runs every
  trap this guard can put a probe behind: first the form that springs the
  trap, then the remedy the entry names against it. The entry counts as
  verified only when the trap springs *and* the remedy stops it, because a
  probe that cannot tell those two apart has measured neither. What it does
  not probe is not quietly dropped. Traps that live inside the Claude Code
  harness, one that would need a test runner installed, one that only shows
  itself across a series of pushes, ones whose mechanism is a logic class no
  host can vary, any whose shell or interpreter the host does not carry:
  each is named with its number and the reason it was not run, and the guard
  refuses to go green while any catalog entry is neither probed nor
  explained. Its output is that list, so this README does not keep a second
  copy of it. If a trap ever stops reproducing, the guard goes red on
  purpose. That is the catalog asking to be re-verified, not a broken build;
  it has already falsified two of its own entries that way, [with the
  measurements](docs/what-the-numbers-say.md).

All three<!-- count:guards --> guards run their **counter-test first**
(`--self-test`): each proves it *can* go red before its green is accepted. A
guard without a counter-test is a claim.

<!-- section: provenance -->
## Where the numbers come from

Every number in this repository carries its source and population; see
[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md). The source
corpus is the working corpus of [wolf-agents.com](https://wolf-agents.com),
a solo-built production B2B security SaaS (~190k lines of application
TypeScript and ~174k lines of tests, measured 2026-08-21 with the counting
rule on the numbers page; 262 files in its review chain). The corpus
itself is not published: it contains the architecture and security
findings of a live product. What's published is the pattern, not the corpus.

Nothing here claims the method is proven. One check is proven to catch one
real error class; the rest is a pattern with measurements attached, offered
so you can run the measurement yourself.

<!-- section: about -->
## Author, license, status

Built by **Eduard Wolf** (eduard@wolf-agents.com) — distilled from the
source corpus of [wolf-agents.com](https://wolf-agents.com), developed
solo and almost entirely through briefed, autonomous Claude Code sessions.
The commits here carry a Claude co-author line, so the division of labor
should be stated, not implied: the sessions wrote the code and the briefs;
the human part is the method, the choice of what gets measured, the
judgment about what carries and what is ritual — and every push. MIT
license.

The obvious objection writes itself: an AI-written corpus as the evidence
for a method about AI sessions. The answer here is separation, not
assurance. The push is one instance of it: a session prepares it, a human
decides it. One level deeper, in the source project this is distilled
from, evaluation is separated from generation the same way: an adversarial
review gate reads the work with fresh context, and the gate's *own* miss
rate is measured instead of estimated. That metric sits in
[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md) with its
stated limits: it separates self-report from external finding; it does not
resolve the ambiguity. The pattern and its comparison to Anthropic's
harness literature are in [docs/method.md](docs/method.md).

Trap verifications are dated (last full pass: 2026-08-21), and the subset a
Linux runner can reproduce is re-run in CI on every push, with the rest
named there rather than assumed. Tools change; if a trap no longer
reproduces on your version, that is a finding — an issue with a repro beats
an issue with an opinion.
