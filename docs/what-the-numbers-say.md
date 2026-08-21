# What the numbers say — and what they don't

Anyone can claim their agent setup works. Almost nobody publishes the
measurement that fails to support the claim. This page is that measurement.

## The setting

The pattern in this repository was distilled from the working corpus of a
solo-maintained production B2B SaaS: roughly 159k lines of application
TypeScript and 126k lines of test code, developed almost entirely through
briefed, autonomous Claude Code sessions. Its review chain comprises 262
files — 85 session briefs and 49 result reports among them (counted
2026-08-21, recursively, in the corpus directory).

In August 2026 a meta-chain of sessions turned the method on itself: it
measured the harness instead of the product. The numbers below are from
those runs. The corpus is not published — it contains the architecture and
security findings of a live product. What is published is the pattern, and
the numbers with their populations.

## The headline measurement — and what it does not show

After an optimization of the harness (a hard cap on the context file, a
gate workflow decoupled from deploys), the chain compared the context drift
of sessions before the change with the two sessions after it:

> "With n = 2 after the optimization, no trend in the review gate is
> provable; the halved context drift is statistically indistinguishable
> (Welch's t ≈ 1.9, p ≈ 0.12), and one session from BEFORE the optimization
> already sat below both after-values."

Three honest limits, stated in the source itself and sharpened here:

- **n = 2.** Two post-optimization sessions prove nothing about a trend.
- **One pre-optimization session already beat both post-values.** Whatever
  improved, the measurement cannot attribute it to the optimization.
- **The metric itself is under-documented.** "Context drift" was measured in
  the session that ran the comparison; the pre-series and the metric's exact
  definition were not durably written down. By this repository's own
  standard, the headline number does not fully meet the evidence bar — that,
  too, is a finding, and the reason the chain now writes measurements down
  before citing them.

The sentence the source corpus uses for all of this:

> **"The net has become denser; the fish is not demonstrably bigger."**

## What the numbers do show

**One thing is proven: a check catches a real error class.** The class is
stale numbers in living documents — a brief keeps citing an old baseline
after the baseline moved. A cross-source check (every living brief compared
against the measured baselines, on every push, in CI) caught it repeatedly:

- One session pushed four stale numbers and was stopped by CI — locally
  everything had been green, because the check's only caller was CI.
- A later session ran the same check locally *before* pushing and caught
  four stale numbers pre-push.

The source corpus is precise about what that means:

> "The red CI run proves compensation, not discipline. The session pushed
> four stale numbers and was stopped by the machine. That is good, but it is
> not the same as 'the work got more careful.'"

Whether the machine is compensating for sloppiness or the work is getting
cleaner is now itself a tracked series (CI-red → local-green → local-red-
before-push; n = 3 — no trend yet, but counted from now on).

## Supporting measurements, each with its population

- **62 % of pushes triggered no CI run.** 157 pushes to main over eleven
  days, 98 without any run, measured with `gh run list` (not with `git log`
  arithmetic — that method is off by a factor of ~20, see trap 10). Cause:
  `paths:` filters plus the fact that end-of-session docs pushes match no
  code path. Fix: a gate workflow with no path filter.
- **A 25.0 % cut of the context file did not stay cut.** 181,534 → 136,245
  characters; but 44.6 % of the file (121 of 340 content units) were mixed
  units — history and live rules interleaved, not mechanically separable —
  and the file regrows by ~6,200 characters per session. The source's own
  verdict: the cut "bought time, built no mechanism."
- **Of 69 coverage promises in 9 guard files, 3 were empty and 2 narrowed.**
  One guard surface had been "a promise about nothing" for nineteen
  sessions: its extension filter matched zero files in the directory it
  claimed to scan. Found only when the promises themselves were measured
  against the file system.
- **21 defects of one session's own making: 0 found by reading.** 9 were
  found by the session's own guard and measurement runs, 12 by its
  adversarial review gate. (The first version of this very count was
  hand-tallied as 8/4/15 — and wrong. Re-measured: 10/9/12 across the
  overlapping categories, 0 by reading either way. "A hand-counted value is
  a claim, even in the report about claims.")
- **Escape rate, defined and started.** Defects a session's author and its
  review gate both missed, found later by CI, a successor, a production
  smoke test, or the owner — normalized per 1,000 changed lines. First data
  points: 1.49 and 1.02 escaped/1,000 for two earlier sessions, 0 (so far)
  for the session that built the metric. Stated limits: every value is a
  lower bound; a rising rate can mean sloppier work *or* more thorough
  successors — the metric separates self-report from external finding, it
  does not resolve that ambiguity; values compare within the corpus and mean
  nothing as absolutes.
- **Enforced artifacts get used; offered ones don't.** In the two sessions
  measured: checks wired into CI or imports were effective 2 of 2 times;
  artifacts that were merely available (subagent definitions, a progress
  directory) were used 0 of 2 and 1 of 2 times. The corpus' later refinement:
  an instruction works when it *meets* the executor — nothing had named the
  offered artifacts.

## Drift found while building this repository

The brief that commissioned this repository carried its own drifted claims —
caught by re-measuring, which is the method:

- A predecessor document said the corpus held "237 briefs"; measured, it
  holds 262 files, of which 85 are briefs. The number had never been counted.
- The commissioning brief quoted the net-and-fish sentence with an extra
  "demonstrably" in the first clause. The source has it only in the second.
- It stated the auto-memory cap as "25 KB"; the measured cap is 25,000
  *characters* (the tool's internal name for it misleadingly says bytes).
- A claimed "pre-series scatters by a factor of eight" could not be found in
  any persisted source — so it does not appear in this repository.

## Provenance

| Number | Source | Population |
|---|---|---|
| t ≈ 1.9, p ≈ 0.12; one pre-value below both post-values | meta-chain brief HE-3, verbatim | 2 post-optimization sessions vs. pre-series (pre-series not durably documented) |
| 4 stale numbers stopped by CI; 4 caught pre-push | result reports RE-3b, HE-3 | living briefs at push time |
| 62 % pushes without run | result report HE-1 | 157 pushes / 11 days, `gh run list` |
| −25.0 % cut; 44.6 % mixed units; ~6,200 chars/session regrowth | brief + result report HE-2 | context file, 181,534 chars, 340 units |
| 69 promises / 3 empty / 2 narrowed | result report AA-K1 | 9 guard files at HEAD |
| 21 own defects / 0 by reading | result report HE-3 | one session's registered defects |
| escape-rate points 1.49 / 1.02 / 0 per 1,000 lines | result report HE-3 | changed lines in src, services, scripts per session |
| corpus size 262 / 85 / 49 | counted for this repository, 2026-08-21 | recursive file count of the corpus directory |

The corpus documents themselves are not published (see The setting). Within
the corpus, every number above carries its measuring command and date; the
chain's standing rule applies here too: **a number from a document is a
claim — including this document.**
