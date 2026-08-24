<!--
  SESSION BRIEF TEMPLATE

  How this template is meant to be used - read this once, because it is the
  most important thing in the file:

  A human writes the FIRST brief from this template. Every brief after that
  is written by the outgoing session as its last deliverable, while its
  knowledge is fresh and measured. Do not ask a human to fill this in from
  scratch before every session - that approach was tried in the corpus this
  pattern was distilled from (as pre-written "skeleton" briefs) and it
  failed: the expensive parts (verified paths, exact commands, known traps)
  were deferred to a pre-session expansion that then had to be done by hand,
  every time, at 11 to 23 times the skeleton's size (measured). The chain
  form fixes that structurally: the previous session writes the next brief
  at the end of its own run.

  Everything in [brackets] is a placeholder. Sections marked (optional) can
  be dropped for small tasks. Keep the rest - each section exists because
  briefs without it measurably failed. See docs/method.md for the evidence.

  Counting note: docs/method.md names ten parts and this file has twelve ##
  sections. The lifecycle header is the frontmatter, not a section, and
  three sections beyond the ten are practical rather than measured - "What
  this is — and what it is not", "The mission", and "Guardrails".
-->

---
status: "open"
created: "[YYYY-MM-DD]"
chain: "[chain-name, e.g. MIGRATE]"
this: "[chain-name]-[n]"
predecessor-result: "[path to previous session's result report, or 'none - first brief']"
successor: "[to be written by this session at the end of its run]"
---

# BRIEF [chain-name]-[n] — [task name]

**Size: [S / M / L].** One session, one deliverable. If this brief plans more
than one new mechanism or a large volume of new content, it is two briefs -
split it now, not when the context window runs out.

## Read first

In this order, before touching anything. This list is complete - if something
is not on it, you do not need it to start.

1. `[path]` — [why]
2. `[path]` — [why]

Where sources conflict: [name the winner now - do not leave conflicts for the
agent to resolve; resolve them in the brief].

## What this is — and what it is not

**Is:** [one paragraph: the job, its purpose, who consumes the result.]

**Is not:** [the adjacent job someone could mistake this for. Naming it here
prevents the most expensive kind of scope drift - the well-intentioned kind.]

## The one sentence

> [The single invariant that everything hangs on, e.g. "The report iterates
> the catalog, not the results."]

**Its test:** [one operational check that tells you the invariant holds,
answerable with a command or a look at the artifact.]

## Measured starting state

Measured, not guessed. Every number carries the command that produced it and
the date. If a number cannot be reproduced, it does not belong here.

| What | Value | Measured with | Date |
|---|---|---|---|
| [metric] | [value] | `[command]` | [date] |

**Re-measure before you rely on it.** Your predecessor's numbers are claims
until you have reproduced them. If your measurement differs, yours wins - with
the evidence in your result report. (In the source corpus, sessions corrected
between zero and eight inherited values per run. Plan for it - and treat a
clean zero as a result worth reporting, not as wasted effort.)

## Owner decisions — fixed, not up for debate

| Question | Decision | Reason |
|---|---|---|
| [decided question] | [decision] | [reason] |

**Default for new questions:** decide with reasons, implement, document the
decision in your result report. Do not stop to ask, do not leave it as a TODO.
The operator is not available between sessions.

## The mission

[Numbered, concrete, with file paths where known. Verified paths - marked as
verified - not expected paths.]

## Non-goals — each with its reason

The most valuable section and the rarest. These are not "out of scope" lines;
they are things considered and rejected, with the reason, so the next person
does not repeat the analysis.

| Do not | Why |
|---|---|
| [rejected action] | [reason it was rejected] |

**Parked, not commissioned:** [good ideas that surfaced but have no build
authorization. Parking them here keeps them from being built AND from being
forgotten.]

## Known traps

Only traps that were actually hit, with the mechanism. No brainstormed risks.

1. [trap, its mechanism, and the guard against it]

(For tool-level traps - shells, git, CI, YAML - install the tool-traps skill
from this repository; do not restate its content here.)

## Guardrails

- **Evidence duty.** Every number in your report carries its source and
  population. "Measured" and "estimated" are strictly separated.
- **A green check is not a "done" claim.** Open the artifact you produced.
  Walk the path a user would walk. In the source corpus, seven sessions in a
  row found a user-visible defect this way that the diff review and every
  automated check had missed.
- [project-specific guardrails]

## The planned cut

This section is why sessions in the source corpus stopped overflowing.

- **The seam:** [where this task naturally splits - half A: ...; half B: ...]
- **The trigger:** if more than half your context window is spent when half A
  is done, cut. Measure your consumption; do not estimate it.
- **What half A must be when you cut:** complete, green, delivered, with its
  result report - not a half-finished fragment.
- **What happens to half B:** it gets its own full brief, written by you,
  named [chain-name]-[n]b.

A planned cut is a clean delivery. Running over is not.

## Gate

Done means all of the following, verifiably:

1. [criterion with exact expected value, not a direction - "exactly 0", not
   "fewer"]
2. [criterion]
3. Every guard you built or changed has a counter-test: you made it fail once
   on purpose and it failed. A guard without a counter-test is a claim.

## Completion

Your result report contains:

- what was done, with the measured after-state (same table as the starting
  state, re-measured);
- every autonomous decision you made, with reasons;
- every inherited number you corrected;
- new traps you hit, with mechanisms - what you consider obvious, your
  successor does not know;
- **what argues against your own result** - a result without a named weakness
  is unfinished;
- and the next brief, [chain-name]-[n+1], to the same standard as this one,
  as a file AND as a copy-ready start block. This is not optional; the chain
  must carry without the operator.
