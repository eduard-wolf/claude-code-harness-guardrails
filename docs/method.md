# The session-brief pattern

How a source corpus of 85 briefs converged on ten parts, with the
measurements that show which parts carry weight and which turned out to be
ritual.

## Where the pattern comes from

The source corpus (see [what-the-numbers-say.md](what-the-numbers-say.md) for
the setting) contains three generations of briefing documents. The cohorts:
82 first-generation "goal files" (by filename prefix), plus the 85 briefs
split by first-git-commit date into 19 early briefs (June–July 2026) and 66
chain-era briefs (August 2026), so the table below spans 167 documents, of
which the 85 briefs carry the pattern. Counted 2026-08-21. Only rows whose
counting rule is a one-line grep over `## `-level headings are
printed; an earlier version of this table carried classifier-dependent rows
that an independent reproduction could not confirm, so they are gone:

| Row (counting rule) | Gen 1 (n=82) | Gen 2 (n=19) | Gen 3 (n=66) |
|---|---|---|---|
| Guardrails section (`## ` heading matching `guardrail`) | 0 | 0 | 43 |
| Trap-catalog section (matching `fallen`/`fallstricke`) | 0 | 0 | 26 |
| Owner-decisions section (matching `owner-entscheidung`) | 0 | 0 | 24 |
| Median file size (`wc -c`) | 15.5 KB | 6.9 KB | 19.2 KB |
| Median warning glyphs (`⚠` count) | 0 | 1 | 4 |

The numbers show two things. First, the form *shrank* before it grew:
generation 2 briefs are half the size of generation 1, because the task
specification moved out of the prompt and into verified references.
Second, three of the mature form's defining sections — guardrails, the trap
catalog, owner decisions — appear in zero of the 101 pre-August documents
and in 43, 26, and 24 of the 66 August briefs. (Mission, non-goals, gate,
and handoff sections exist across all generations under many heading
variants; their per-generation counts depend on the classification regex,
so this table does not claim them.)

**The pivotal design change is not a section at all.** Generation 1 was
written by a human. Generation 3 briefs are written by the *outgoing
session* as its final deliverable, while its knowledge is fresh and
measured. The corpus also contains the instructive middle form: five
pre-written "skeleton" briefs that deferred the expensive parts (verified
paths, exact commands, known traps) to a "flesh out before session start".
The sessions all ran, but not one ran a skeleton as written: each skeleton
first had to be expanded by hand into a full brief 11 to 23 times its size
(measured 2026-08-21 on the three pairs that sit side by side in the corpus:
4.5→49.8 KB, 3.3→76.2 KB, 3.7→64.4 KB). The skeleton saved nothing; the
expensive work moved to an unplanned rewrite, every time.
Top-down templates lost to bottom-up handoffs. That is why this repository
ships a *seed* template, not a form to fill in per session.

## The ten parts

For the template itself see
[template/session-brief.md](../template/session-brief.md); it carries all
ten, and still has twelve `##` sections — part 1 lives in the frontmatter
rather than in a section, and three sections beyond these ten are
practical rather than measured: what the session is and is not, the
mission, and the project-specific guardrails. What each part does, and the
evidence it earned its place:

1. **Lifecycle header.** Status, chain position, predecessor's result,
   successor. A brief that knows whether it is still valid; completed briefs
   get a do-not-rerun banner. In the corpus, a schema guard enforces the
   frontmatter.
2. **Read-first list.** Few sources, ordered, explicitly complete — with
   conflicts between sources resolved *in the brief*, not left to the agent.
3. **The one sentence.** A single invariant plus one operational test for
   it. Everything else in the session serves this line.
4. **Measured baseline.** Every number with its command and date — plus the
   standing counter-rule: *re-measure your predecessor's numbers; if yours
   differ, yours win, with evidence.* In the corpus, sessions corrected
   between zero and eight inherited values per run, and the zero is the
   interesting case: one session reported "for the first time in this chain,
   no inherited number was wrong," the rule producing evidence of health
   rather than busywork. A brief is a claim.
5. **Owner decisions, fixed.** Decisions made before the session, as a
   table — plus a default for new questions: decide with reasons, implement,
   document; never stall. Measured effect: result reports carry
   "autonomous decisions" sections (17 and 12 entries in two adjacent
   sessions) instead of blocked questions.
6. **Non-goals with reasons.** Not "out of scope" — *considered and
   rejected, with the reason*, so successors do not repeat the analysis.
   Plus a parking lot ("Parked, not commissioned") that keeps good ideas
   from being silently built or silently lost.
7. **Trap catalog.** Only traps actually hit, with mechanisms. Two corpus
   findings temper it: a warned trap was still hit twice (warnings shorten
   diagnosis; they do not prevent the misstep), and emphasis inflates — see
   "What turned out to be ritual".
8. **Context budget as a construction parameter.** The rule that ended
   overflows in the corpus has four clauses: one session introduces at most
   one new mechanism and a bounded volume of new content; the seam for a
   planned cut is named *before* starting; consumption is measured, not
   felt; and at half the window you cut, so that the first half ships
   complete and green and the second half gets its own full brief. "A
   planned cut is a clean delivery. Running over is not."
9. **Gate with exact numbers.** Done-criteria as exact expected values,
   not directions, and every guard built in the session needs its
   counter-test (make it fail once on purpose). A guard without a
   counter-test is a claim.
10. **Completion protocol.** The result report mirrors the baseline table
    re-measured, and lists autonomous decisions, corrected inherited
    numbers, new traps with mechanisms, and what argues against the result.
    It ends with the session *writing the next brief*, as a file and as a
    copy-ready start block. The chain must carry without the operator.

## The control pair

The corpus contains a natural experiment on part 8. Two adjacent sessions of
the same chain, same kind of work:

- **Session A** had no context-budget rule (its only size signal was an
  effort label, "L"). It introduced five new mechanisms at once, overran the
  context window, and needed a second run to finish. Its production smoke
  test never ran: the shipped artifact was defective in four user-visible
  places despite a green gate, a review gate passed in full, and 86 probes.
- **Session B**, briefed after the failure, carried the budget rule, a named
  seam, and a cut criterion. It measured the real surface (nine times larger
  than assumed), cut at the named seam "deliberately, not by running
  aground", shipped half A complete and green, and wrote the brief for
  half B itself. Its numbers: one new mechanism, 568 lines of new content
  against the ~500 guideline.

The difference was not a stricter rule. Session A had *no* rule of this
class; the class was invented in response. Context consumption went from a
property of the run to a planned parameter with a breaking point.

## What turned out to be ritual

Measured on the same corpus — the pattern's own dead weight:

- **A closing incantation** ("use ultrathink") appears in 40 of 85 briefs.
  No result report ever attributes any effect to it. It propagates as a
  formula because each brief copies the last one's shape.
- **Effort labels without mechanics** ("Effort: L") control nothing. The
  session that overran its window carried one. Labels became useful only
  when replaced by the budget rule above.
- **Warning-marker inflation.** Warning glyphs per brief rose from 0–1
  (June) to 30–44 (the six briefs of August 20–21). When nearly every
  paragraph is marked, marking prioritizes nothing; no report ever cites a
  marker, only content. Late briefs already compensate by pulling "the six
  traps most likely to cost you" ahead of the catalog, which concedes the
  point. This repository's trap catalog therefore orders by mechanism and
  stamps by date, and skips the glyphs.

## Failure modes, measured

The error classes the meta-chain established — each observed, none
hypothetical. Condensed; populations in
[what-the-numbers-say.md](what-the-numbers-say.md):

1. **Stale numbers in second sources.** A baseline moves; living documents
   keep citing the old value. The only fix that held was mechanical: one
   register, cross-checked in CI on every push.
2. **Hand-counted values.** Wrong even inside the report about wrong
   numbers (8/4/15 → re-measured 10/9/12). Numbers come from commands.
3. **Empty coverage promises.** A check that scans nothing looks exactly
   like a check that passes ("a promise about nothing" for 19 sessions). Promises need to be measured against the file system.
4. **Silent tool failures.** Zero-hit regex dialects, swallowed exit codes,
   empty extractions, reporter fields contradicting exit codes — the whole
   [trap catalog](../plugin/skills/tool-traps/SKILL.md).
5. **Name-pinned guards.** A guard that checks for three strings stays green
   while the guarded script is gutted. Guards must measure mechanisms, not
   names.
6. **Self-report.** Every quality number an agent produces about its own
   work is a self-report; "more named defects" can mean more diligence or
   worse work. The escape rate exists to separate self-report from external
   finding, and still only shifts the ambiguity, documented as such.
7. **Offered artifacts go unused.** Enforced checks were effective 2 of 2
   times; merely available artifacts were used 0–1 of 2. An instruction
   works when it reaches the one executing it: wire it into CI or name it
   in the brief.
8. **Measuring under concurrent load.** Two measurements of the same value
   in the same minute differed (a parallel run was mutating the tree).
   Measurements need a quiet, pinned state.
9. **Emphasis inflation.** See above — a failure mode of the briefing form
   itself.
10. **Register copies.** Every copy of a number is a future divergence; the
    corpus's hardest rule is also this repository's: no second register. The
    problem is not that copies go stale. The problem is that copies exist.

## Relation to Anthropic's harness literature

The pattern was developed independently against the same problem the
Anthropic engineering posts describe. Where they overlap and where they
differ ([Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
2025-11-26; [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps),
2026-03-24; demo repo: [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents)):

**Shared ground.**

- One bounded unit of work per session: "one feature per session" there,
  one mechanism per session here.
- Handoff artifacts between sessions: a progress file, a feature list and
  git there; a result report and the next brief here.
- Fresh-context evaluation separate from generation: their evaluator agent,
  the corpus's adversarial review gate.
- Evidence before "passing": their default-FAIL contract with an
  evidence-read gate, and the corpus's rule that a green gate is not a
  done-claim. Open the artifact and walk the user's path. Seven consecutive
  sessions found a user-visible defect that way, one that diff review and
  all probes had missed.
- Pruning the harness as models improve: their "re-simplify on model
  upgrades", the corpus's measured removal of a June-era meta-rule.

**What the literature does not cover — and this pattern does.** Measuring
the *evaluator's* miss rate (escape rate) instead of tuning it
anecdotally; machinery against stale numbers in living documents; an
evidence duty for numbers in prose, where their evidence gate covers
pass-flags rather than claims; non-goals with reasons as a first-class
section; context budget with a *named seam* decided before the session
rather than reactive compaction; and publishing the measurement of one's
own method even where it is unflattering.

**What the literature has that this pattern lacks.** Operator controls
(kill switch, mid-run steering), a planner/generator/evaluator role split,
and capped unattended loops are all better developed there. Nothing here
replaces them; the brief pattern composes with them.

## How to adopt this

Start smaller than the corpus did:

1. Write one brief from the [template](../template/session-brief.md) — fill
   the baseline table by running the commands, not from memory.
2. Install the [trap catalog](../plugin/skills/tool-traps/SKILL.md) so the
   session knows the tool traps without re-learning them.
3. End the session by letting it write the next brief. Resist editing it
   beyond corrections — the chain form is the point.
4. Add one guard with a counter-test the first time a number appears in two
   places. Do not add ten guards; add the one whose error class you have
   actually seen.
