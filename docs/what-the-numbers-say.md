# What the numbers say — and what they don't

Anyone can claim their agent setup works. Almost nobody publishes the
measurement that fails to support the claim. This page is that measurement.

## The setting

The pattern in this repository was distilled from the working corpus of
[wolf-agents.com](https://wolf-agents.com), a solo-built production B2B
security SaaS: 189,691 lines of application TypeScript and 174,015 lines of
test code in 433 test files (measured 2026-08-21; counting rule below),
developed almost entirely through briefed, autonomous Claude Code sessions.
Its review chain comprises 262 files, including 85 session briefs and 49
result reports (counted 2026-08-21, recursively, in the corpus directory).

In August 2026 a meta-chain of sessions turned the method on itself: it
measured the harness instead of the product. The numbers below are from
those runs. The corpus is not published — it contains the architecture and
security findings of a live product. What is published is the pattern, and
the numbers with their populations.

One framing note for the failure numbers: each describes a measured
historical window in the source project's process, and each appears along
with the mechanism that closed it. The 62% gap was closed by the unfiltered
gate workflow, the stale numbers by the cross-source check, the empty
coverage promises by the promise-measuring guard, and the overflow by the
budget rule.

## The headline measurement — and what it does not show

After an optimization of the harness (a hard cap on the context file, a
gate workflow decoupled from deploys), the chain compared the context drift
of sessions before the change with that of the two sessions after it:

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
  definition were never persisted. By this repository's own standard, the
  headline number does not fully meet the evidence bar. That, too, is a
  finding, and the reason the chain now writes measurements down before
  citing them.

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

- **62% of pushes triggered no CI run.** 157 pushes to main over 11 days,
  98 without any run, measured with `gh run list` rather than with
  `git log` arithmetic, which is off by a factor of ~20 (see trap 10).
  Cause: `paths:` filters plus the fact that end-of-session docs pushes
  match no code path. Fix: a gate workflow with no path filter.
- **A 25.0% cut of the context file did not stay cut.** 181,534 → 136,245
  characters. But 121 of its 340 content units were mixed: history and live
  rules interleaved, not mechanically separable. The source's 44.6% is a
  share of the file, not of those units: 121 of 340 is 35.6%. The file
  regrows by ~6,200 characters per session. The source's own verdict: the
  cut "bought time, built no mechanism."
- **Of 69 coverage promises in 9 guard files, 3 were empty and 2 narrowed.**
  One guard surface had been "a promise about nothing" for 19 sessions: its
  extension filter matched zero files in the directory it claimed to scan.
  Found only when the promises themselves were measured against the file
  system.
- **21 defects of one session's own making: 0 found by reading.** 9 were
  found by the session's own guard and measurement runs, 12 by its
  adversarial review gate. (The first version of this very count was
  hand-tallied as 8/4/15 — and wrong. Re-measured: 10/9/12 across the
  overlapping categories, 0 by reading either way. "A hand-counted value is
  a claim, even in the report about claims.")
- **Escape rate, defined and started.** Defects a session's author and its
  review gate both missed, found later by CI, a successor, a production
  smoke test, or the owner. Normalized per 1,000 changed lines. First data
  points: 1.49 and 1.02 escaped/1,000 for two earlier sessions, 0 (so far)
  for the session that built the metric. Stated limits: every value is a
  lower bound, and a rising rate can mean sloppier work *or* more thorough
  successors. The metric separates self-report from external finding; it
  does not resolve that ambiguity. Values compare within the corpus and
  mean nothing as absolutes.
- **Enforced artifacts get used; offered ones don't.** In the two sessions
  measured: checks wired into CI or imports were effective 2 of 2 times;
  artifacts that were merely available (subagent definitions, a progress
  directory) were used 0 of 2 and 1 of 2 times. The corpus's later
  refinement: an instruction works when it *reaches whoever has to carry it
  out*, and nothing had named the offered artifacts.

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

A four-perspective pre-publication review (hiring-manager, developer,
fact-checker, leak-checker) then caught five more claims in this repository
itself that did not survive verification:

- an overclaim about what the counts guard checks: it said "stated" where
  only *marked* counts are measured;
- a trap stated more broadly than its measurement, the agents-directory
  trap, since narrowed to the documented mechanism;
- a guard example valid in bash but silently inert in the catalog's own
  stamped shell, `${PIPESTATUS[0]}` under zsh;
- a "skeletons sit unexecuted" claim the corpus git log refutes: the
  sessions ran, on hand-expanded briefs 11 to 23 times the skeleton's size;
- a generation table whose classification rule was not stated and whose
  fragile rows an independent reproduction could not confirm.

All five are fixed; the error class survives: **a number from a document is
a claim — including the documents in this repository.**

Then a guard began finding them without being asked. `verify-traps.mjs`
re-runs the catalog's own claims on every push. Two entries did not survive
it:

- **Trap 5 was true where it had been measured and false one runner away.**
  Found on the guard's first two runs against a host it was not written on:
  the first aborted inside its own self-test and printed nothing, and the
  second carried the measurement into the log. The entry said `\s`, `\b` and
  `\d` all "silently match nothing" under a macOS stamp. Over the same
  fixture: macOS with git 2.50.1 gives 0 hits and exit 1 for all three;
  ubuntu-latest with git 2.55.0 and glibc gives `\s` 1
  hit at exit 0, `\b` 1 hit at exit 0, and `\d` 0 hits at exit 1. The entry
  had understated its own trap: the check does not fail everywhere; it
  changes its verdict with the machine. Corrected in `2ac3400`.
- **Trap 1's guard sentence contained the very form it warns against.** The
  remedy the entry named was `for f in ${(f)$(...)}`. On zsh 5.9 that yields
  one element with the newlines collapsed into spaces, while `${(f)"$(...)"}`
  yields three. The rule the sentence stated was right; the example beside
  it was the trap. This probe needs zsh, which the Linux runner does not
  have, so the finding came from a local run. Corrected in `220828b`. Two
  entries in this catalog have now printed, in their own guard sentence, the
  trap that entry teaches: the `${PIPESTATUS[0]}` example, caught by a
  reviewer reading, and this one, caught by a probe running.

Neither of the two falsifications above was found by reading. Both came from
machinery that re-runs the claims, one of them on a host the author does not
control.

## Provenance

| Number | Source | Population |
|---|---|---|
| t ≈ 1.9, p ≈ 0.12; one pre-value below both post-values | meta-chain brief HE-3, verbatim | 2 post-optimization sessions vs. pre-series (pre-series never persisted) |
| 4 stale numbers stopped by CI; 4 caught pre-push | result reports RE-3b, HE-3 | living briefs at push time |
| 62% pushes without run | result report HE-1 | 157 pushes / 11 days, `gh run list` |
| −25.0% cut; 44.6% of the file mixed; ~6,200 chars/session regrowth | brief + result report HE-2 | context file, 181,534 chars, 340 units |
| 69 promises / 3 empty / 2 narrowed | result report AA-K1 | 9 guard files at HEAD |
| 21 own defects / 0 by reading | result report HE-3 | one session's registered defects |
| escape-rate points 1.49 / 1.02 / 0 per 1,000 lines | result report HE-3 | changed lines in src, services, scripts per session |
| enforced artifacts 2/2, offered 0/2 and 1/2 | meta-chain brief HE-3 | the two sessions after the HE-2 optimization |
| corpus size 262 / 85 / 49 | counted for this repository, 2026-08-21 | recursive file count of the corpus directory |
| 189,691 lines application TS; 174,015 lines tests in 433 files | measured for this repository, 2026-08-21 | `find src -type f \( -name '*.ts' -o -name '*.tsx' \)` excluding `__tests__/`, `*.test.*`, `*.spec.*`, `*.d.ts`, generated i18n and content collections, summed batch-safe via `cat \| wc -l`; tests = the excluded test files. Rule from the source project's metrics register (first measured 2026-07-12: 158,743 / 125,857 in 338 files — the delta is 40 days of growth) |

The corpus documents themselves are not published (see The setting). Within
the corpus, every number above carries its measuring command and date; the
chain's standing rule applies here too: **a number from a document is a
claim — including this document.**
