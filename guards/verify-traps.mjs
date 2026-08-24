#!/usr/bin/env node
// Guard: every trap in the catalog is either reproduced on this host at every
// push, or named — with its number and a reason — as one that cannot be.
//
// The catalog's traps carry a verification date and an environment. That is the
// honest form of the claim, and it is still a claim: a dated stamp goes stale
// silently the moment a tool changes, and nothing in the repository notices.
// This guard is the machine behind the date. It runs each trap's *trap form*
// and demands that the trap still happens, then runs *the remedy the entry
// names against it* and demands that the trap stops happening. A probe that
// cannot tell those two apart proves nothing about either. ("Names", not
// "prints": entry 1's guard sentence once printed an example that did not
// work — see the finding below — so the probe runs the forms that sentence's
// rule yields rather than its illustration, and prints the unquoted form's
// measurement alongside.)
//
// Red is the point here, not the accident:
//
//   trap-not-reproduced  A trap stopped reproducing. That is a finding about
//                        the catalog, not a bug in this file — re-verify the
//                        entry, re-date it, or retire it.
//   guard-does-not-hold  The remedy the catalog recommends no longer works
//                        here. Same class, worse: the entry is actively
//                        misleading until someone looks.
//
// Two failure modes this guard is built not to commit (docs/method.md,
// "Failure modes, measured"):
//
//   3. Empty coverage promises. A check that scans nothing looks exactly like
//      a check that passes. So: every catalog number is accounted for — a
//      probe or a stated reason, never silence; a skip reason too short to be
//      a reason is red; a run in which no probe at all could execute is red
//      rather than green-with-zero-work; and where a probe covers only part of
//      an entry, it prints what it does not cover.
//   5. Name-pinned guards. A guard that checks for names stays green while the
//      thing behind the names is gutted. So the register is read out of the
//      catalog on every run: entry 16 is red until someone decides about it,
//      and a probe pointing at an entry the catalog no longer has is red too —
//      this file may not quietly keep measuring a number that moved.
//
// What a probe may assert, learned by measuring:
//
//   Never a message. `git grep -l PATTERN --untracked` — the usage error entry
//   3 is about — reports in the user's language: measured 2026-08-24,
//   "Schwerwiegend: die Option '--untracked' muss vor den Argumenten kommen"
//   on the maintainer's machine, English on the CI runner. Every assertion
//   here is on an exit code, a byte count, or a token this file put into its
//   own fixture. Git probes run under LC_ALL=C so the *detail line* reads the
//   same in both logs; nothing depends on what it says.
//
//   Nothing that needs installing. Node builtins only, no npm, no apt: a guard
//   that has to install first proves less and costs more on a workflow that
//   deliberately carries no `paths:` filter (that is entry 10).
//
//   Absence is data, not an excuse. A missing tool makes its probe
//   `skipped: <tool> not present on this host`, printed on that trap's own line
//   and again in the coverage line. zsh is the live case — entry 1 is about
//   zsh, and the maintainer's machine has one. Whether a given CI image does
//   is not asserted here from a software list; the environment line this guard
//   prints on that host is the measurement, and the counter-test summary says
//   how many probes went unrun and why.
//
// A finding this guard produced while it was being built, kept here because
// this is where it was made: entry 1's guard sentence printed the array form as
// `for f in ${(f)$(...)}`. Measured on zsh 5.9, that form yields *one* item —
// `[a b c]`, the newlines collapsed to spaces — where `${(f)"$(...)"}` yields
// three. The unquoted illustration rebuilt the very trap the entry teaches. The
// sentence around it did say "quote everything", so the rule was right and only
// the example was not. Corrected in 220828b; the probe below still runs the two
// forms the rule yields (`while read`, and the array form quoted) and prints the
// unquoted form's measurement beside them at every push, because the catalog
// being right today is not a reason to stop measuring it.
//
// Self-test (a guard without a counter-test is a claim, not a guard):
//   node guards/verify-traps.mjs --self-test
// The probes execute once; judging what they recorded is a pure function, so
// every counter-test is a re-judgement of that record and costs no further
// processes. Two per probe — the trap form recorded as no longer reproducing,
// the guard form recorded as no longer holding — plus one per structural
// branch. Each must raise *its own* new error; accepting "some error appeared"
// would let one unrelated red satisfy all of them at once. Probes skipped for a
// missing tool generate no counter-tests, and the summary says how many were
// left out and why, because a counter-test count that quietly shrinks is the
// same empty promise one level further out.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = 'plugin/skills/tool-traps/SKILL.md';

// Every error this guard can raise. The self-test refuses to pass while one of
// these has no counter-test, so the list cannot quietly grow past its proof.
const BRANCHES = {
  'trap-not-reproduced': 'a catalogued trap no longer reproduces on this host',
  'guard-does-not-hold': 'the remedy the catalog prints for a trap no longer prevents it',
  'probe-error': 'a probe could not run at all — no verdict either way',
  unassigned: 'a catalog entry with neither a probe nor a stated reason',
  'double-assigned': 'a catalog entry listed as probed and as skipped',
  'no-such-entry': 'a probe or skip reason for an entry the catalog does not have',
  'skip-reason-missing': 'a skip whose reason is too short to be a reason',
  'nothing-probed': 'not one probe ran — a green with no measurement behind it',
  'catalog-unreadable': 'the catalog this guard reads its register out of is not there',
  'duplicate-number': 'one entry number carried twice — in the catalog, or by two probes',
  'heading-drift': 'the entry behind a probed number is no longer about the same thing',
  'guard-text-drift': "a probe's printed claim about its entry no longer matches the entry",
  'heading-malformed': 'a heading that is nearly an entry heading, and so is counted as none',
  'required-tool-missing': 'a tool this run was told the host must have is not here',
};

// ---------------------------------------------------------------- running things

const lines = s => s.split(/\r?\n/);
const firstLine = s => lines(s.trim())[0] || '';

// One line per trap is a promise the output makes about its own shape, and any
// detail that interpolates a tool's stdout can break it from the outside. Every
// detail and every message passes through here first.
const flat = s => String(s == null ? '' : s).replace(/\s*\r?\n\s*/g, ' ⏎ ').trim();

// Run a command and return what happened. Never throws: a non-zero exit is the
// subject of half these probes. Entry 5's second half is exactly this — `git
// grep` exits 1 on zero matches, which inside execFileSync *throws* — so
// catching it and reading it as "zero matches" is that entry's own guard,
// applied here to the guard itself.
function run(file, args, opts = {}) {
  const base = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 };
  try {
    const stdout = execFileSync(file, args, { ...base, ...opts });
    return { status: 0, stdout, stderr: '', missing: false };
  } catch (e) {
    if (e.code === 'ENOENT') return { status: null, stdout: '', stderr: '', missing: true };
    return {
      status: typeof e.status === 'number' ? e.status : null,
      stdout: typeof e.stdout === 'string' ? e.stdout : '',
      stderr: typeof e.stderr === 'string' ? e.stderr : '',
      missing: false,
    };
  }
}

// A probe inherits the environment of whoever started it, and that environment
// can decide what a shell does before the probe's first character runs.
// Measured 2026-08-24, every one of them turning a probe *false-red* and
// blaming the catalog for it: `BASH_ENV` pointing at a file that echoes (eight
// errors); a `ZDOTDIR` whose `.zshenv` sets `shwordsplit nonomatch` ("trap 1 no
// longer reproduces — re-verify and update the catalog"); `SHELLOPTS=pipefail`
// (trap 2, same sentence); `SHELLOPTS=xtrace` (trap 3, both halves).
//
// False-red is not the harmless direction. This guard's red says "your catalog
// is stale, go re-verify an entry"; when the truth is "your shell was
// configured behind my back", it sends somebody to edit a correct entry. So
// the shells start from a scrubbed environment.
const SHELL_LEAKS = [
  'BASH_ENV', 'ENV', 'SHELLOPTS', 'BASHOPTS', 'ZDOTDIR', 'CDPATH',
  'IFS', 'PS4', 'BASH_XTRACEFD', 'POSIXLY_CORRECT',
];

// Computed per call rather than once at load, so the self-test can pollute
// process.env, run every probe again, and demand the same verdicts.
function shellEnv() {
  const env = { ...process.env };
  for (const key of SHELL_LEAKS) delete env[key];
  return env;
}

// Shells are named explicitly, never `sh` and never `shell: true`: which shell
// answers to `sh` is exactly the kind of host difference that would decide a
// probe about shells. zsh reads `.zshenv` even for `zsh -c`; only `-f` skips it
// (measured: with ZDOTDIR set, `zsh -c` picks the file up, `zsh -f -c` does
// not). bash reads nothing non-interactively once BASH_ENV is gone.
const shellArgs = (shell, script) => (shell === 'zsh' ? ['-f', '-c', script] : ['-c', script]);
const sh = (shell, script, opts = {}) => run(shell, shellArgs(shell, script), { env: shellEnv(), ...opts });

// Git reads more of the environment than anything else here, and an enumerated
// list of GIT_* variables to remove is precisely the name-pinned guard this
// repository argues against: it is correct until the next git release adds a
// variable, and then it is silently incomplete. Every GIT_* is removed, and the
// few the probes need are put back.
//
// What that list missed while it was a list, all measured: `GIT_TRACE=1` (trap
// 3's guard "does not hold", because the trace lands on the stderr the probe
// reads); `GIT_CONFIG_COUNT`/`KEY_0`/`VALUE_0` and `GIT_CONFIG_PARAMETERS`
// (any config at all, injected past GIT_CONFIG_GLOBAL). HOME and
// XDG_CONFIG_HOME point inside the probe's own directory because the global
// ignore file lives under both, and one `brand-new.txt` line in it made trap 6
// report that its remedy no longer works.
function gitEnv(dir) {
  const env = shellEnv();
  for (const key of Object.keys(env)) if (/^GIT_/.test(key)) delete env[key];
  return {
    ...env,
    HOME: dir,
    XDG_CONFIG_HOME: join(dir, 'xdg-empty'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C',
    LANG: 'C',
  };
}
const git = (dir, args) => run('git', args, { cwd: dir, env: gitEnv(dir) });

// CI runners carry no git identity; a commit without one fails, and the probe
// would then report a trap that "no longer reproduces" for the wrong reason.
// The excludes file and hooks path are pinned for the same reason one level
// out: both are ways for the host to change what `git add` does.
function initRepo(dir) {
  git(dir, ['init', '-q', '.']);
  git(dir, ['config', 'user.name', 'trap probe']);
  git(dir, ['config', 'user.email', 'probe@example.invalid']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.excludesFile', '/dev/null']);
  git(dir, ['config', 'core.hooksPath', join(dir, 'no-hooks')]);
}

// The fixture is a measurement too, and it was the one measurement nothing
// looked at. Measured: with commit signing forced on through
// GIT_CONFIG_PARAMETERS and no key on the host, every commit here failed with
// 128, no HEAD ever existed — and the guard reported "trap verification: OK —
// 8 of 15". A probe standing on a fixture that was never built is a tautology
// with an exit code. Anything that throws here becomes `probe-error`, which is
// a verdict of "no verdict", not a pass.
function commitAll(dir, message) {
  const add = git(dir, ['add', '-A']);
  if (add.status !== 0) throw new Error(`fixture: git add exited ${add.status} — ${flat(add.stderr) || 'no message'}`);
  const commit = git(dir, ['commit', '-q', '-m', message]);
  if (commit.status !== 0) throw new Error(`fixture: git commit exited ${commit.status} — ${flat(commit.stderr) || 'no message'}`);
  const head = git(dir, ['rev-parse', 'HEAD']);
  if (head.status !== 0) throw new Error(`fixture: no HEAD after committing (git rev-parse exited ${head.status})`);
  const tracked = git(dir, ['ls-files']);
  if (tracked.stdout.trim() === '') throw new Error('fixture: the commit tracked no files — an ignore rule or a hook swallowed it');
  return tracked.stdout.trim();
}

const write = (dir, name, body) => writeFileSync(join(dir, name), body);

// One Ruby program for both halves of entry 11. It names what happened instead
// of leaving an exit code to be interpreted, so a typo in this file cannot pass
// for a YAML syntax error.
const RUBY_PROBE = "begin; v = YAML.safe_load(ARGV[0]); puts 'PARSED:' + v['description'].to_s; "
  + "rescue Psych::SyntaxError; puts 'SYNTAX_ERROR'; rescue => e; puts 'OTHER:' + e.class.to_s; end";
const runRuby = text => run('ruby', ['-ryaml', '-e', RUBY_PROBE, '--', text]);

// ---------------------------------------------------------------- the probes

// Each probe: the catalog number it belongs to, the tools it needs, an optional
// fixture, the trap form, and the guard form the entry prints. Both forms
// return {ok, detail} — `ok` is judged, `detail` is printed either way.
const PROBES = [
  {
    n: 1,
    title: 'zsh word-splitting, and the dead glob that kills the line',
    heading: 'zsh',
    // What the guard half below actually executes, and therefore what entry 1's
    // remedy paragraph still has to name. `heading` binds the probe to the
    // entry's subject; this binds it to the entry's *advice*. Without it the
    // number can match, the heading can match, and the sentence underneath can
    // recommend something this probe never runs — a name-pinned guard (failure
    // class 5) one level in. `neverNames` is the other direction: the unquoted
    // form is the trap, and an entry that offers it as the remedy has rebuilt
    // what it teaches. It did once; see the finding at the top of this file.
    remedy: {
      names: ['${(f)"$(...)"}', 'while read'],
      neverNames: ['${(f)$(...)}'],
    },
    requires: ['zsh', 'bash', 'cat'],
    setup: dir => write(dir, 'items.txt', 'a\nb\nc\n'),
    trap: dir => {
      const inZsh = sh('zsh', 'VAR="a b c"; n=0; for f in $VAR; do n=$((n+1)); done; echo N=$n', { cwd: dir });
      const inBash = sh('bash', 'VAR="a b c"; n=0; for f in $VAR; do n=$((n+1)); done; echo N=$n', { cwd: dir });
      const glob = sh('zsh', 'echo before; echo *.nomatch-xyz; echo after', { cwd: dir });
      const out = lines(glob.stdout);
      const died = out.includes('before') && !out.includes('after') && glob.status !== 0;
      return {
        ok: inZsh.stdout.trim() === 'N=1' && inBash.stdout.trim() === 'N=3' && died,
        detail: `for f in $VAR → ${inZsh.stdout.trim()} in zsh where bash gives ${inBash.stdout.trim()}; dead glob → "after" never printed, exit ${glob.status}`,
      };
    },
    guard: dir => {
      const quoted = sh('zsh', 'n=0; for f in ${(f)"$(cat items.txt)"}; do n=$((n+1)); done; echo N=$n', { cwd: dir });
      const read = sh('zsh', 'n=0; while IFS= read -r f; do n=$((n+1)); done < items.txt; echo N=$n', { cwd: dir });
      const asPrinted = sh('zsh', 'n=0; for f in ${(f)$(cat items.txt)}; do n=$((n+1)); done; echo N=$n', { cwd: dir });
      const safeGlob = sh('zsh', 'echo before; echo "*.nomatch-xyz"; echo after', { cwd: dir });
      return {
        ok: quoted.stdout.trim() === 'N=3' && read.stdout.trim() === 'N=3'
          && lines(safeGlob.stdout).includes('after') && safeGlob.status === 0,
        // This line reports the two shell forms and nothing about the catalog.
        // It used to say "the entry prints the unquoted form", which was true
        // when it was written and false the moment the entry was corrected —
        // a probe describing an artifact it never reads is the same stale
        // second register the catalog is about. Binding the verdict to the
        // entry's text is a real change and belongs in its own slice.
        detail: '${(f)"$(...)"} → ' + quoted.stdout.trim() + ', while read → ' + read.stdout.trim()
          + ', quoted glob → "after" printed; unquoted, ${(f)$(...)} gives '
          + (asPrinted.stdout.trim() || 'nothing')
          + (asPrinted.stdout.trim() === quoted.stdout.trim()
            ? ' — no different from the quoted form on this host'
            : ' — that is the trap form, not the guard'),
      };
    },
  },

  {
    n: 2,
    title: 'the exit code a harness sees is the last command\'s',
    heading: 'exit',
    requires: ['bash', 'cat'],
    anchors: ['print first, judge second'],
    partial: 'the entry\'s closing advice — if you must print, print first and judge second — is a practice rather than a command, so nothing here executes it',
    trap: () => {
      const echoed = sh('bash', 'false; echo "EXIT=$?"');
      const piped = sh('bash', 'false | cat');
      const zshPipe = HAVE.zsh ? sh('zsh', 'false | cat; exit ${PIPESTATUS[0]}') : null;
      return {
        ok: echoed.stdout.trim() === 'EXIT=1' && echoed.status === 0 && piped.status === 0
          && (zshPipe === null || zshPipe.status === 0),
        // An entry measured in halves has to say so on the line, not only in
        // the half it managed: the coverage line otherwise counts this entry as
        // fully probed on a host that never ran its second shell.
        partial: zshPipe ? null : 'the entry\'s zsh half (${PIPESTATUS[0]} expanding to empty, and $pipestatus[1] against it) needs a zsh, and this host has none',
        // Kept even when the zsh half runs: the entry ends in advice, and
        // advice is not a command this probe can execute.
        detail: `false; echo "EXIT=$?" prints ${echoed.stdout.trim()} and exits ${echoed.status}; false | cat exits ${piped.status}`
          + (zshPipe
            ? `; in zsh, exit \${PIPESTATUS[0]} exits ${zshPipe.status} — the bash form expands to empty there`
            : '; the zsh half of this entry was not measured'),
      };
    },
    guard: () => {
      const pipefail = sh('bash', 'set -o pipefail; false | cat');
      const last = sh('bash', 'echo before; false');
      const zshPipe = HAVE.zsh ? sh('zsh', 'false | cat; exit $pipestatus[1]') : null;
      return {
        ok: pipefail.status === 1 && last.status === 1 && (zshPipe === null || zshPipe.status === 1),
        detail: `set -o pipefail → exit ${pipefail.status}; the measured command last on the line → exit ${last.status}`
          + (zshPipe ? `; zsh's own $pipestatus[1] → exit ${zshPipe.status}` : ''),
      };
    },
  },

  {
    n: 3,
    title: '2>/dev/null on a measurement hides that it failed',
    heading: 'measurement',
    requires: ['bash', 'git', 'head', 'wc'],
    setup: dir => {
      initRepo(dir);
      write(dir, 'tracked.txt', 'nothing of interest here\n');
      commitAll(dir, 'fixture');
      write(dir, 'untracked.txt', 'NEEDLE_XYZ lives here\n');
    },
    // The trap is not that the command fails. It is that a failed command and a
    // real zero-hit search become the same bytes once stderr is thrown away.
    trap: dir => {
      const opts = { cwd: dir, env: gitEnv(dir) };
      const control = sh('bash', 'git grep -l "nothing of interest"', opts);
      const broken = sh('bash', 'git grep -l NEEDLE_XYZ --untracked 2>/dev/null', opts);
      const zeroHit = sh('bash', 'git grep -l ABSENT_QQQ_PATTERN 2>/dev/null', opts);
      const truncated = sh('bash', "printf '%s\\n' a b c d e f g h i j k l m | head -5 | wc -l", opts);
      // Without this, "both printed nothing" is also satisfied by a repository
      // that can find nothing at all.
      const searchable = control.status === 0 && control.stdout.includes('tracked.txt');
      // The exit codes must differ. Without that, two commands that failed the
      // same way satisfy "indistinguishable" and the detail line prints its own
      // contradiction — measured on a directory with no repository in it:
      // ok: true beside "only the exit code still separates them (128 vs 128)".
      const indistinguishable = broken.stdout === zeroHit.stdout && broken.stderr === '' && zeroHit.stderr === '';
      return {
        ok: searchable && indistinguishable && broken.stdout === '' && broken.status !== zeroHit.status
          && Number(truncated.stdout.trim()) === 5,
        detail: `in a repository that does find things (${control.stdout.trim() || 'nothing'}, exit ${control.status}), a usage error and a real zero-hit search print the same ${broken.stdout.length} bytes — only the exit code still separates them (${broken.status} vs ${zeroHit.status}); head -5 on a 13-line measurement reports ${truncated.stdout.trim()}`,
      };
    },
    guard: dir => {
      const opts = { cwd: dir, env: gitEnv(dir) };
      const broken = sh('bash', 'git grep -l NEEDLE_XYZ --untracked', opts);
      const zeroHit = sh('bash', 'git grep -l ABSENT_QQQ_PATTERN', opts);
      const full = sh('bash', "printf '%s\\n' a b c d e f g h i j k l m | wc -l", opts);
      return {
        ok: broken.stderr.trim() !== '' && zeroHit.stderr.trim() === '' && Number(full.stdout.trim()) === 13,
        detail: `with stderr read, the broken search says so in ${broken.stderr.trim().length} bytes while the real zero-hit search stays silent; without head the measurement reports ${full.stdout.trim()}`,
      };
    },
  },

  {
    n: 4,
    title: 'a failed extraction looks exactly like a result',
    heading: 'extraction',
    requires: ['bash', 'sed', 'wc', 'tr'],
    setup: dir => {
      write(dir, 'nomarkers.txt', 'line one\nline two\nline three\n');
      write(dir, 'markers.txt', 'start\nAAA\npayload\nBBB\nend\n');
    },
    trap: dir => {
      const r = sh('bash', "sed -n '/AAA/,/BBB/p' nomarkers.txt > out; rc=$?; echo rc=$rc; wc -c < out | tr -d ' '", { cwd: dir });
      const [rc, bytes] = lines(r.stdout.trim());
      return {
        ok: rc === 'rc=0' && bytes === '0',
        detail: `sed -n '/AAA/,/BBB/p' with both markers absent → exit ${(rc || '').replace('rc=', '')}, ${bytes} bytes written, and the pipeline carries on`,
      };
    },
    guard: dir => {
      const floor = "n=$(wc -c < out | tr -d ' '); if [ ${n:-0} -gt 0 ]; then echo SIZE=$n; else echo EMPTY_EXTRACTION; exit 3; fi";
      const empty = sh('bash', `sed -n '/AAA/,/BBB/p' nomarkers.txt > out; ${floor}`, { cwd: dir });
      const real = sh('bash', `sed -n '/AAA/,/BBB/p' markers.txt > out; ${floor}`, { cwd: dir });
      return {
        ok: empty.status === 3 && empty.stdout.trim() === 'EMPTY_EXTRACTION'
          && real.status === 0 && real.stdout.trim().startsWith('SIZE='),
        detail: `the same extraction behind a size floor → ${empty.stdout.trim()}, exit ${empty.status}; on a file that has the markers → ${real.stdout.trim()}, exit ${real.status}`,
      };
    },
  },

  {
    n: 5,
    title: 'git grep -E uses the platform ERE — and which escapes fail depends on the host',
    heading: 'POSIX',
    requires: ['git'],
    anchors: ['give every new negative check a counter-test that must fail', 'plant one match, expect red'],
    partial: 'the entry also tells you to counter-test every new negative check by planting a match — a practice rather than a command, and not something this probe can run on your behalf',
    setup: dir => {
      initRepo(dir);
      write(dir, 'tracked.txt', 'hello world\nvalue 7 here\nnothing here\n');
      commitAll(dir, 'fixture');
    },
    // All three escapes the entry names are measured; only \d is asserted on.
    // That split is itself a measurement: on the first CI run of this guard,
    // \s and \b found their lines on the runner and found nothing here, because
    // glibc's ERE carries the GNU operators and BSD's does not, while \d is a
    // GNU operator on neither. Asserting \s would have made this probe a test
    // of which libc the host uses. Printing all three at every push is what
    // turned "the trap stopped reproducing" into "the trap is platform-split",
    // and that is now in the entry.
    trap: dir => {
      const hits = pattern => {
        const r = git(dir, ['grep', '-E', pattern]);
        return { n: r.status === 0 ? lines(r.stdout.trim()).length : 0, status: r.status };
      };
      const s = hits('hello\\sworld'), d = hits('value \\d here'), b = hits('\\bhello\\b');
      return {
        ok: d.n === 0 && d.status === 1,
        detail: `over "hello world" / "value 7 here": \\d → ${d.n} hit(s) exit ${d.status} (the escape no ERE dialect here understands, and the one this probe judges); \\s → ${s.n} hit(s) exit ${s.status}, \\b → ${b.n} hit(s) exit ${b.status} — those two are the platform split, printed rather than judged`
          + `; exit 1 for zero matches throws inside execFileSync, and reading it as "zero matches" instead of "command failed" is this entry's own second half`,
      };
    },
    guard: dir => {
      const space = git(dir, ['grep', '-E', 'hello[[:space:]]world']);
      const digit = git(dir, ['grep', '-E', 'value [[:digit:]] here']);
      return {
        ok: space.status === 0 && space.stdout.includes('hello world')
          && digit.status === 0 && digit.stdout.includes('value 7 here'),
        detail: `the POSIX classes carry on both hosts: [[:space:]] → ${lines(space.stdout.trim()).length} hit(s) exit ${space.status}, [[:digit:]] → ${lines(digit.stdout.trim()).length} hit(s) exit ${digit.status}`,
      };
    },
  },

  {
    n: 6,
    title: 'git grep without --untracked cannot see the files you just made',
    heading: 'untracked',
    requires: ['git'],
    setup: dir => {
      initRepo(dir);
      write(dir, 'tracked.txt', 'nothing of interest here\n');
      commitAll(dir, 'fixture');
      write(dir, 'brand-new.txt', 'NEEDLE_SIX lives here\n');
    },
    // The control is the point. "0 hits" satisfies this assertion just as well
    // when the search sees *nothing* — an ignore rule, an empty repository, a
    // fixture that never committed — and then the probe reports the trap
    // reproducing for a reason that has nothing to do with the trap. So the
    // same search must find the committed file in the same breath.
    anchors: ["name the search surface in the check's output", 'node_modules'],
    partial: 'the entry\'s second half — name the search surface in the check\'s own output — is a practice rather than a command, and its node_modules corollary needs a repository this probe does not build',
    trap: dir => {
      const control = git(dir, ['grep', '-l', 'nothing of interest']);
      const r = git(dir, ['grep', '-l', 'NEEDLE_SIX']);
      return {
        ok: control.status === 0 && control.stdout.includes('tracked.txt')
          && r.status === 1 && r.stdout === '',
        detail: `the same search finds the committed file (${control.stdout.trim() || 'nothing'}, exit ${control.status}) and not the one written but never committed (${r.stdout.trim() || '0 hits'}, exit ${r.status}) — which rules out "it saw nothing at all"`,
      };
    },
    guard: dir => {
      const r = git(dir, ['grep', '-l', '--untracked', 'NEEDLE_SIX']);
      return {
        ok: r.status === 0 && r.stdout.includes('brand-new.txt'),
        detail: `--untracked → ${r.stdout.trim()}, exit ${r.status}`,
      };
    },
  },

  {
    n: 8,
    title: 'ANSI colour codes defeat a grep on tool output',
    heading: 'ANSI',
    requires: ['bash', 'perl', 'grep'],
    anchors: ['diffing error lists *with line numbers* measures code shifts, not new'],
    partial: 'the entry\'s second-order half — that diffing error lists *with* line numbers measures code shifts rather than new errors — needs two runs of a real tool and is not probed here',
    // The fixture is written from Node, not from printf: it has to be the same
    // bytes under bash 3.2 and bash 5, and \033 versus \e is precisely the kind
    // of difference that would turn a probe about grep into one about printf.
    setup: dir => write(dir, 'colored.txt', 'src/a.astro:3:1 - \u001b[31merror\u001b[39m ts(2304): name not found\n'),
    trap: dir => {
      const r = sh('bash', "command -p grep -c ' - error ' colored.txt", { cwd: dir });
      return {
        ok: r.stdout.trim() === '0' && r.status === 1,
        detail: `the line reads " - error " to the eye; grep -c over the coloured bytes → ${r.stdout.trim()}, exit ${r.status}`,
      };
    },
    guard: dir => {
      const r = sh('bash', "perl -pe 's/\\e\\[[0-9;]*m//g' colored.txt | command -p grep -c ' - error '", { cwd: dir });
      return {
        ok: r.stdout.trim() === '1' && r.status === 0,
        detail: `escapes stripped first (perl -pe 's/\\e\\[[0-9;]*m//g') → ${r.stdout.trim()}, exit ${r.status}`,
      };
    },
  },

  {
    n: 11,
    title: 'an unquoted ": " inside a YAML value is a hard parse error',
    heading: 'YAML',
    requires: ['ruby'],
    anchors: ['is skipped entirely', 'loads the skill body with empty metadata'],
    partial: 'only the parse half — that a broken agent file is skipped whole while a broken SKILL.md loads with empty metadata is Claude Code behaviour, and there is no binary on this host to measure it against',
    trap: () => {
      const r = runRuby('description: Use when: always');
      return {
        ok: r.stdout.trim() === 'SYNTAX_ERROR',
        detail: `YAML.safe_load('description: Use when: always') → ${r.stdout.trim() || `no verdict at all (exit ${r.status})`}`,
      };
    },
    guard: () => {
      const r = runRuby('description: "Use when: always"');
      return {
        ok: r.stdout.trim() === 'PARSED:Use when: always',
        detail: `the same value quoted → ${r.stdout.trim() || `no verdict at all (exit ${r.status})`}`,
      };
    },
  },
];

// Entries this guard does not probe, each with the reason printed at every run.
// The rule behind the list: probe where the trap or its remedy is a tool
// invocation whose behaviour a version could change; state a reason where it is
// a property of the reader's own pattern, a tool this guard may not install, or
// the Claude Code harness, which is on no runner.
const SKIPPED = {
  7: 'logic class, not version-bound — the mechanism is a pattern written against the green form, so a probe would only re-measure its own fixture',
  9: 'would need a vitest installation, and this guard installs nothing; the entry already carries the measured version divergence',
  10: 'the mechanism spans a series of pushes — what a paths: filter does per push cannot be measured inside one run',
  12: 'Claude Code harness only — the session file watcher this is about is not on this host',
  13: 'Claude Code harness only — the truncation happens while the Claude Code binary loads MEMORY.md',
  14: 'Claude Code harness only — grep and rg are shell-snapshot functions over the binary\'s own engines there, absent from any shell this guard starts',
  15: 'logic class, not version-bound — a regex has no context on any version; the entry is about what to build instead',
};

// ---------------------------------------------------------------- environment

const HAVE = {};

// Only ENOENT means absent. A tool whose `--version` exits non-zero is still a
// tool, and folding that into "absent" silently drops its probe: measured with
// a zsh wrapper that exits 3 on `--version`, the guard printed "zsh absent",
// skipped entry 1 and exited 0. Presence and version are two questions, and
// this used to answer both with one value.
const POSIX_TOOLS = ['sed', 'wc', 'tr', 'head', 'grep', 'cat'];

function detect() {
  const versionOf = (tool, args, pick) => {
    const r = run(tool, args);
    if (r.missing) return null;
    if (r.status !== 0) return `present (\`${tool} ${args.join(' ')}\` exited ${r.status})`;
    return pick(r.stdout) || 'present (version unreadable)';
  };
  HAVE.bash = versionOf('bash', ['--version'], s => firstLine(s).replace(/^GNU bash, version /, ''));
  HAVE.zsh = versionOf('zsh', ['--version'], s => firstLine(s).replace(/^zsh /, ''));
  HAVE.git = versionOf('git', ['--version'], s => firstLine(s).replace(/^git version /, ''));
  HAVE.perl = versionOf('perl', ['-e', 'print $^V'], s => s.trim());
  HAVE.ruby = versionOf('ruby', ['--version'], s => firstLine(s).replace(/^ruby /, '').split(' ')[0]);
  // The POSIX tools the probes actually spawn. Without these in `requires`, a
  // host missing `sed` reads as "trap 4 no longer reproduces — re-verify the
  // catalog", which is a lie about the catalog.
  for (const tool of POSIX_TOOLS) HAVE[tool] = run(tool, ['--version']).missing ? null : 'present';
  const uname = run('uname', ['-sr']);
  HAVE.os = uname.status === 0 ? uname.stdout.trim() : `${process.platform} ${process.arch}`;
  HAVE.node = process.version;
}

const envLine = () => {
  const missing = POSIX_TOOLS.filter(t => !HAVE[t]);
  return 'environment: ' + [
    HAVE.os,
    `bash ${HAVE.bash || 'absent'}`,
    `zsh ${HAVE.zsh || 'absent'}`,
    `git ${HAVE.git || 'absent'}`,
    `perl ${HAVE.perl || 'absent'}`,
    `ruby ${HAVE.ruby || 'absent'}`,
    `node ${HAVE.node}`,
  ].join(' · ')
    + (missing.length ? ` · POSIX tools absent: ${missing.join(', ')}` : '');
};

// Tools this run was told the host must have. The workflow passes them, because
// "the image provides bash, git, perl and ruby" is a statement about CI and
// belongs where CI is configured — and because without it a runner image that
// drops ruby just probes less and stays green. Measured before the flag existed:
// a PATH without git reported "OK — 5 of 15" and exited 0. zsh is deliberately
// not on the workflow's list; that absence is the known, printed gap.
function requiredTools(argv) {
  const out = [];
  argv.forEach((a, i) => {
    if (a === '--require' && argv[i + 1]) out.push(...argv[i + 1].split(','));
    else if (a.startsWith('--require=')) out.push(...a.slice('--require='.length).split(','));
  });
  return [...new Set(out.map(s => s.trim()).filter(Boolean))];
}

// ---------------------------------------------------------------- the catalog

// `## N)` is an entry. Fenced blocks are skipped: entry 15 is about regexes
// that cannot tell code from prose, and reading Markdown line by line is one.
//
// Headings come back with the numbers, because a number on its own is a weak
// binding. Measured on a copy: rewriting entry 5 into a different subject
// whose remedy recommends the trap form left this guard reporting "trap 5:
// reproduced | guard holds" and exiting 0 — failure class 5 committed by the
// file whose header warns about it. Each probe now also names a word its
// entry's heading has to contain, the same shape as the READMEs' trap-refs.
//
// The same binding, one layer down, on what a probe *says* rather than what it
// runs (`guard-text-drift`). Two shapes, both learned by committing them here:
//
//   The remedy. A probe executes forms; the entry recommends forms; nothing
//   held the two together. Entry 1's probe runs the quoted array form, so
//   entry 1's remedy paragraph has to still name it — and must not name the
//   unquoted one, which is the trap. Measured: rewriting that paragraph back to
//   the trap form now raises two errors and exits 1, where before it changed
//   nothing at all.
//
//   The coverage note. A `partial` line tells the reader which half of an entry
//   went unprobed by quoting that half. Five of them did so from memory: true
//   when written, silently false one catalog edit later — this file's own
//   version of the stale second register it exists to catch. Each now names the
//   phrase it leans on, compared whitespace-squashed so a reflow is not drift.
//
// Printed verdicts are quoted out of the entry (`entry names: …` comes from the
// remedy paragraph's own code spans). Header comments may describe the catalog;
// printed claims may not.
//
// A heading that is nearly an entry heading is louder than one that is missing
// — the lesson check-counts.mjs learned about markers, one file over. `### 16)`
// and `##  7)` (two spaces) both fail the exact form, and both used to simply
// vanish from the register: the first silently, the second as a confusing
// `no-such-entry` about a number that is right there in the file.
function catalogEntries(text) {
  const found = [], malformed = [];
  let inFence = false, current = null, collecting = false;
  lines(text.replace(/\r\n?/g, '\n')).forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const exact = /^## (\d+)\)\s*(.*)$/.exec(line);
    if (exact) {
      current = { n: Number(exact[1]), title: exact[2].trim(), guardText: null, body: '' };
      collecting = false;
      found.push(current);
      return;
    }
    if (/^#{1,6}\s*\d+\s*\)/.test(line)) { malformed.push({ line: i + 1, text: flat(line) }); return; }
    if (!current) return;
    current.body += line + '\n';
    // The remedy paragraph, verbatim: `**Guard:**` up to the blank line after
    // it. Only the first one per entry — check-counts.mjs holds the invariant
    // that there is exactly one, so a second would be its finding, not this
    // file's, and taking the first keeps the two guards from disagreeing.
    if (!collecting && current.guardText === null && /^\*\*Guard:\*\*/.test(line)) {
      collecting = true; current.guardText = line; return;
    }
    if (collecting) {
      if (line.trim() === '') { collecting = false; return; }
      current.guardText += '\n' + line;
    }
  });
  return { found, malformed };
}

// The inline-code spans of a remedy paragraph, in the order the entry prints
// them. What a probe says it verified is quoted out of this, never written
// beside it — the whole point of reading the entry rather than remembering it.
const codeSpans = text => [...String(text || '').matchAll(/`([^`]+)`/g)].map(m => m[1]);

// Anchors are compared against whitespace-squashed text on both sides. A
// reflow is not drift, and a guard that goes red at a line break is one a
// maintainer learns to loosen.
const squash = text => String(text || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- measuring

// Every probe gets its own directory under os.tmpdir(), removed again whether
// the probe succeeded, failed, or threw.
function observe(probe) {
  const obs = { missingTool: null, error: null, trap: null, guard: null };
  const absent = (probe.requires || []).find(t => !HAVE[t]);
  if (absent) { obs.missingTool = absent; return obs; }
  let dir = null;
  try {
    dir = mkdtempSync(join(tmpdir(), `verify-trap-${probe.n}-`));
    if (probe.setup) probe.setup(dir);
    obs.trap = probe.trap(dir);
    obs.guard = probe.guard(dir);
  } catch (e) {
    obs.error = e && e.message ? e.message : String(e);
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  return obs;
}

// Reading the catalog is caught rather than left to throw. A guard whose only
// unexplained output is a Node stack trace fails in the one way it teaches
// against: exit 1 is correct, but "readFileUtf8" is not a diagnosis.
function measure() {
  detect();
  let entries = [], malformed = [], catalogError = null;
  try {
    const parsed = catalogEntries(readFileSync(join(ROOT, CATALOG), 'utf8'));
    entries = parsed.found;
    malformed = parsed.malformed;
  } catch (e) {
    catalogError = e && e.message ? e.message : String(e);
  }
  const titles = {}, entryGuards = {}, entryBodies = {};
  for (const e of entries) if (!(e.n in titles)) {
    titles[e.n] = e.title; entryGuards[e.n] = e.guardText; entryBodies[e.n] = e.body;
  }
  return {
    numbers: entries.map(e => e.n),
    titles,
    entryGuards,
    entryBodies,
    malformed,
    catalogError,
    have: { ...HAVE },
    required: requiredTools(process.argv),
    probes: PROBES.map(p => ({
      n: p.n, title: p.title, heading: p.heading, requires: [...(p.requires || [])],
      remedy: p.remedy ? { names: [...p.remedy.names], neverNames: [...p.remedy.neverNames] } : null,
      anchors: [...(p.anchors || [])],
      partial: p.partial || null, obs: observe(p),
    })),
    skipped: { ...SKIPPED },
  };
}

const clone = s => ({
  numbers: [...s.numbers],
  titles: { ...s.titles },
  entryGuards: { ...s.entryGuards },
  entryBodies: { ...s.entryBodies },
  malformed: s.malformed.map(m => ({ ...m })),
  have: { ...s.have },
  required: [...s.required],
  catalogError: s.catalogError,
  probes: s.probes.map(p => ({
    ...p,
    remedy: p.remedy ? { names: [...p.remedy.names], neverNames: [...p.remedy.neverNames] } : null,
    anchors: [...(p.anchors || [])],
    obs: {
      ...p.obs,
      trap: p.obs.trap && { ...p.obs.trap },
      guard: p.obs.guard && { ...p.obs.guard },
    },
  })),
  skipped: { ...s.skipped },
});

// ---------------------------------------------------------------- judging

function judge(state) {
  const errors = [];
  const fail = (code, text) => errors.push({ code, text });
  const report = [];
  const probed = [], notProbed = [];
  // Name the versions of the tools *this* probe used. The single global
  // "where" printed bash's version under a zsh finding, which is a small lie
  // in the one sentence that asks somebody to go re-verify an entry.
  const whereFor = p => [state.have.os, ...(p.requires || []).map(t => `${t} ${state.have[t] || 'absent'}`)].join(', ');

  // A tool the caller declared mandatory is not allowed to be quietly absent;
  // otherwise a shrinking image just probes less and stays green.
  for (const tool of state.required) {
    if (!state.have[tool]) {
      fail('required-tool-missing', `this run requires ${tool} and the host has none — every probe needing it would be skipped, and a smaller green is not a green`);
    }
  }

  const byNumber = new Map();
  for (const p of state.probes) {
    if (!byNumber.has(p.n)) byNumber.set(p.n, []);
    byNumber.get(p.n).push(p);
  }
  const isSkipped = n => Object.prototype.hasOwnProperty.call(state.skipped, n);

  // Without the catalog there is no register, and every check below would
  // report a consequence of that instead of the cause. Say the cause once.
  if (state.catalogError) {
    fail('catalog-unreadable', `${CATALOG} could not be read (${state.catalogError}) — this guard takes its register from the catalog itself, so there is nothing here to verify against`);
    return { errors, report: [], probed: [], notProbed: [], coverage: `coverage: none — ${CATALOG} could not be read` };
  }

  for (const m of state.malformed) {
    fail('heading-malformed', `${CATALOG}:${m.line} reads "${m.text}" — that is nearly an entry heading and counts as none; entries are exactly "## N) title"`);
  }

  // One number, one line: a repeat on either side would print a trap twice and
  // quietly break the one guarantee the output makes about its own shape.
  const unique = [...new Set(state.numbers)].sort((a, b) => a - b);
  if (unique.length !== state.numbers.length) {
    const twice = unique.filter(n => state.numbers.filter(m => m === n).length > 1);
    fail('duplicate-number', `${CATALOG} carries entry number(s) ${twice.join(', ')} more than once — a catalog cannot have two entry ${twice[0]}s`);
  }
  for (const [n, ps] of byNumber) {
    if (ps.length > 1) fail('duplicate-number', `${ps.length} probes claim trap ${n} — only one of them is reported, and which one is an accident`);
  }

  // The register is read out of the catalog, never out of this file.
  for (const n of unique) {
    if (byNumber.has(n) && isSkipped(n)) {
      fail('double-assigned', `trap ${n} is carried as a probe and as skipped at once — one of the two is untrue`);
    }
    if (!byNumber.has(n) && !isSkipped(n)) {
      fail('unassigned', `trap ${n} has neither a probe nor a skip reason — ${CATALOG} grew past this guard, and silence is not coverage`);
    }
  }
  for (const p of state.probes) {
    if (!state.numbers.includes(p.n)) {
      fail('no-such-entry', `a probe claims trap ${p.n} and ${CATALOG} has no entry "## ${p.n})" — the catalog moved, and this guard is measuring a number that is gone`);
      continue;
    }
    // Whole word, not substring — the counts guard learned that one the hard
    // way, where "a" matched almost any heading.
    const title = state.titles[p.n] || '';
    if (p.heading && !new RegExp(`\\b${p.heading}\\b`, 'i').test(title)) {
      fail('heading-drift', `the probe for trap ${p.n} expects "${p.heading}" as a word in that entry's heading, and entry ${p.n} now reads "${title}" — the number survived, the subject behind it did not, and a probe bound to the number alone would have stayed green`);
    }
    if (p.remedy) {
      const paragraph = state.entryGuards[p.n];
      if (!paragraph) {
        fail('guard-text-drift', `the probe for trap ${p.n} verifies the remedy that entry names, and entry ${p.n} has no **Guard:** paragraph to name one — there is nothing here to hold the probe to`);
      } else {
        for (const form of p.remedy.names) {
          if (!paragraph.includes(form)) {
            fail('guard-text-drift', `the probe for trap ${p.n} runs ${form} as the remedy, and entry ${p.n} no longer names it — the probe would keep proving an old sentence works while the catalog recommends a new one. Entry reads: ${flat(paragraph)}`);
          }
        }
        for (const form of p.remedy.neverNames) {
          if (paragraph.includes(form)) {
            fail('guard-text-drift', `entry ${p.n} names ${form} in its remedy, and that is the trap form this probe measures against — the entry is rebuilding what it teaches. Entry reads: ${flat(paragraph)}`);
          }
        }
      }
    }
    // A `partial` line tells the reader which half of the entry went unprobed,
    // by quoting it. That is a printed claim about a document this file used to
    // never open — accurate when written, silently false one edit later. Each
    // such probe names the phrase its partial line leans on, and the phrase has
    // to still be in the entry.
    const flatBody = squash(state.entryBodies[p.n]);
    for (const phrase of p.anchors) {
      if (!flatBody || !flatBody.includes(squash(phrase))) {
        fail('guard-text-drift', `the probe for trap ${p.n} prints a coverage note quoting "${phrase}" from that entry, and entry ${p.n} no longer contains it — the note describes a catalog that has moved`);
      }
    }
  }
  for (const n of Object.keys(state.skipped).map(Number)) {
    if (!state.numbers.includes(n)) {
      fail('no-such-entry', `a skip reason claims trap ${n} and ${CATALOG} has no entry "## ${n})"`);
    }
  }
  for (const [n, reason] of Object.entries(state.skipped)) {
    if (!reason || reason.trim().length < 20) {
      fail('skip-reason-missing', `trap ${n} is skipped without a reason worth the name ("${(reason || '').trim()}") — an unexplained skip is an empty coverage promise`);
    }
  }

  for (const n of unique) {
    const here = (byNumber.get(n) || []).slice(0, 1);
    if (here.length === 0) {
      const reason = state.skipped[n];
      if (reason === undefined) {
        report.push({ n, text: `trap ${String(n).padStart(2)}: UNASSIGNED — neither a probe nor a reason` });
      } else {
        notProbed.push({ n, reason });
        report.push({ n, text: `trap ${String(n).padStart(2)}: skipped    — ${reason}` });
      }
      continue;
    }
    for (const p of here) {
      const { obs } = p;
      if (obs.error) {
        fail('probe-error', `trap ${n}: the probe could not run at all (${flat(obs.error)}) — no verdict either way, which is not a pass`);
        report.push({ n, text: `trap ${String(n).padStart(2)}: ERROR      — ${p.title}: ${flat(obs.error)}` });
        continue;
      }
      if (obs.missingTool) {
        const reason = `${obs.missingTool} not present on this host`;
        notProbed.push({ n, reason });
        report.push({ n, text: `trap ${String(n).padStart(2)}: skipped    — ${reason} (${p.title})` });
        continue;
      }
      probed.push(n);
      const trapDetail = flat(obs.trap.detail), guardDetail = flat(obs.guard.detail);
      if (!obs.trap.ok) {
        fail('trap-not-reproduced', `trap ${n} no longer reproduces on ${whereFor(p)} — re-verify and update the catalog; that is a finding, not a bug. Measured: ${trapDetail}`);
      }
      if (!obs.guard.ok) {
        fail('guard-does-not-hold', `the guard for trap ${n} does not hold on ${whereFor(p)} — the entry recommends a remedy that no longer works. Measured: ${guardDetail}`);
      }
      // Partial coverage is declared statically by the probe and, where a host
      // decides it, by the half that could not run.
      const partials = [p.partial, obs.trap.partial, obs.guard.partial].filter(Boolean).map(flat);
      // Quoted out of the entry, not written beside it: if the catalog changes
      // its advice, this clause changes with it or `guard-text-drift` fires.
      const named = p.remedy
        ? codeSpans(state.entryGuards[p.n]).filter(c => p.remedy.names.some(f => c.includes(f)))
        : [];
      report.push({
        n,
        text: `trap ${String(n).padStart(2)}: ${obs.trap.ok ? 'reproduced' : 'NOT REPROD'} — ${trapDetail}`
          + ` | ${obs.guard.ok ? 'guard holds' : 'GUARD FAILS'}: ${guardDetail}`
          + (named.length ? ` | entry names: ${named.map(flat).join(', ')}` : '')
          + (partials.length ? ` | partial: ${partials.join('; ')}` : ''),
      });
    }
  }

  if (probed.length === 0) {
    fail('nothing-probed', 'not one probe ran on this host — every trap was skipped, and a guard that measures nothing is green for the wrong reason');
  }

  const coverage = `coverage: probed [${probed.join(', ')}] · skipped [${notProbed.map(s => `${s.n}: ${s.reason}`).join(' · ')}]`;
  return { errors, report, probed, notProbed, coverage };
}

// ---------------------------------------------------------------- counter-tests

// Each returns {state, applied}. `applied: false` means the mutation found
// nothing to falsify — a failed self-test, not a passed one: it is how a probe
// that silently stopped recording anything gets caught.
// A probe whose entry is no longer in the register is not judged at all, so
// inverting its record changes nothing and the counter-test reads as "the guard
// proves nothing here" — the second shape of the bug run 32744393366 had.
// Measured before the guard here existed: deleting `## 8)` from the catalog, or
// prefixing an unbalanced fence, or removing the file, all produced only
// "counter-test 13/26 … did not raise trap-not-reproduced" under --self-test,
// while the plain run named `no-such-entry` and `catalog-unreadable` correctly.
// --self-test is the only mode CI runs.
function flip(state, n, half) {
  const out = clone(state);
  const p = out.probes.find(q => q.n === n);
  if (!p || out.catalogError || !out.numbers.includes(n)) return { state: out, applied: false };
  if (p.obs.error || p.obs.missingTool || !p.obs[half] || p.obs[half].ok !== true) {
    return { state: out, applied: false };
  }
  p.obs[half] = { ...p.obs[half], ok: false };
  return { state: out, applied: true };
}

const ranProbes = state => state.probes.filter(p => !p.obs.error && !p.obs.missingTool);

const STRUCTURAL_TESTS = [
  {
    expect: 'unassigned',
    name: 'a probe dropped without a reason put in its place',
    mutate: state => {
      const out = clone(state);
      if (out.probes.length === 0) return { state: out, applied: false };
      out.probes.shift();
      return { state: out, applied: true };
    },
  },
  {
    expect: 'double-assigned',
    name: 'one entry carried as probed and as skipped at once',
    mutate: state => {
      const out = clone(state);
      if (out.probes.length === 0) return { state: out, applied: false };
      out.skipped[out.probes[0].n] = 'a reason long enough to look like a real one';
      return { state: out, applied: true };
    },
  },
  {
    expect: 'required-tool-missing',
    name: 'a tool declared mandatory that this host does not have',
    mutate: state => {
      const out = clone(state);
      out.required = [...out.required, 'a-tool-no-host-carries'];
      return { state: out, applied: true };
    },
  },
  {
    expect: 'heading-malformed',
    name: 'an entry heading with one hash too many',
    mutate: state => {
      const out = clone(state);
      out.malformed = [...out.malformed, { line: 1, text: '### 16) nearly an entry' }];
      return { state: out, applied: true };
    },
  },
  {
    expect: 'heading-drift',
    name: 'the entry behind a probed number rewritten to another subject',
    mutate: state => {
      const out = clone(state);
      const p = out.probes.find(q => q.heading && out.numbers.includes(q.n));
      if (!p) return { state: out, applied: false };
      out.titles[p.n] = 'something else entirely';
      return { state: out, applied: true };
    },
  },
  {
    expect: 'guard-text-drift',
    name: "the remedy a probe runs taken out of the entry's own guard paragraph",
    mutate: state => {
      const out = clone(state);
      const p = out.probes.find(q => q.remedy && out.entryGuards[q.n]
        && q.remedy.names.some(f => out.entryGuards[q.n].includes(f)));
      if (!p) return { state: out, applied: false };
      const form = p.remedy.names.find(f => out.entryGuards[p.n].includes(f));
      out.entryGuards[p.n] = out.entryGuards[p.n].split(form).join('some other advice');
      return { state: out, applied: true };
    },
  },
  {
    expect: 'guard-text-drift',
    name: 'the trap form offered as the remedy in the entry that teaches against it',
    mutate: state => {
      const out = clone(state);
      const p = out.probes.find(q => q.remedy && q.remedy.neverNames.length && out.entryGuards[q.n]);
      if (!p) return { state: out, applied: false };
      out.entryGuards[p.n] += ` or ${p.remedy.neverNames[0]}`;
      return { state: out, applied: true };
    },
  },
  {
    expect: 'guard-text-drift',
    name: 'the half an entry leaves unprobed deleted out of the entry itself',
    mutate: state => {
      const out = clone(state);
      const p = out.probes.find(q => q.anchors.length && out.entryBodies[q.n]
        && q.anchors.some(a2 => out.entryBodies[q.n].replace(/\s+/g, ' ').includes(a2.replace(/\s+/g, ' '))));
      if (!p) return { state: out, applied: false };
      out.entryBodies[p.n] = 'the entry, rewritten past every phrase its coverage note quotes';
      return { state: out, applied: true };
    },
  },
  {
    expect: 'no-such-entry',
    name: 'a probe pointed at an entry number the catalog does not have',
    mutate: state => {
      const out = clone(state);
      if (out.probes.length === 0 || out.numbers.length === 0) return { state: out, applied: false };
      out.probes[0] = { ...out.probes[0], n: Math.max(...out.numbers) + 900 };
      return { state: out, applied: true };
    },
  },
  {
    expect: 'probe-error',
    name: 'a probe that could not run at all',
    mutate: state => {
      const out = clone(state);
      const live = ranProbes(out);
      if (live.length === 0) return { state: out, applied: false };
      live[0].obs.error = 'injected: the probe did not run';
      return { state: out, applied: true };
    },
  },
  {
    expect: 'skip-reason-missing',
    name: 'a skip reason emptied out',
    mutate: state => {
      const out = clone(state);
      const first = Object.keys(out.skipped)[0];
      if (first === undefined) return { state: out, applied: false };
      out.skipped[first] = '';
      return { state: out, applied: true };
    },
  },
  {
    expect: 'duplicate-number',
    name: 'the same entry number carried by two probes',
    mutate: state => {
      const out = clone(state);
      if (out.probes.length === 0) return { state: out, applied: false };
      out.probes.push({ ...out.probes[0] });
      return { state: out, applied: true };
    },
  },
  {
    expect: 'duplicate-number',
    name: 'the same entry number twice in the catalog',
    mutate: state => {
      const out = clone(state);
      if (out.numbers.length === 0) return { state: out, applied: false };
      out.numbers.push(out.numbers[0]);
      return { state: out, applied: true };
    },
  },
  {
    expect: 'catalog-unreadable',
    name: 'the catalog gone from under the guard',
    mutate: state => {
      const out = clone(state);
      if (out.catalogError) return { state: out, applied: false };
      out.catalogError = 'injected: ENOENT, no such file or directory';
      out.numbers = [];
      return { state: out, applied: true };
    },
  },
  {
    expect: 'nothing-probed',
    name: 'every probe reported as missing its tool',
    mutate: state => {
      const out = clone(state);
      if (out.probes.length === 0) return { state: out, applied: false };
      for (const p of out.probes) { p.obs.missingTool = 'bash'; p.obs.error = null; }
      return { state: out, applied: true };
    },
  },
];

// A half that is already failing needs no counter-test: it is not a claim
// waiting for proof, it is the finding this guard exists to produce, and the
// run below reports it in full. Inverting it would only ask "does a red half
// go red", find nothing to falsify, and abort the run before the finding is
// ever printed — which is exactly what happened the first time this guard met
// a host it had not been written on, so the withheld ones are counted out loud
// rather than quietly dropped.
// Not every property is proved by making the guard red. "A hostile environment
// does not change the verdict" is proved by running every probe again inside
// one and getting the same answers — so the probes execute a second time here,
// under an environment built from the five leaks that were measured turning
// them false-red. This is the only part of the self-test that costs processes,
// and it is the part that would otherwise decay into a comment.
function pollute(dir) {
  writeFileSync(join(dir, 'bash_env.sh'), 'echo noise-from-BASH_ENV\n');
  writeFileSync(join(dir, '.zshenv'), 'setopt shwordsplit nonomatch\n');
  const xdgGit = join(dir, 'xdg', 'git');
  mkdirSync(xdgGit, { recursive: true });
  // Names every fixture file the git probes create, which is what made trap 6
  // report that its own remedy had stopped working.
  writeFileSync(join(xdgGit, 'ignore'), 'brand-new.txt\nuntracked.txt\ntracked.txt\n');
  return {
    BASH_ENV: join(dir, 'bash_env.sh'),
    ZDOTDIR: dir,
    SHELLOPTS: 'xtrace',
    CDPATH: '/',
    GIT_TRACE: '1',
    XDG_CONFIG_HOME: join(dir, 'xdg'),
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.excludesFile',
    GIT_CONFIG_VALUE_0: join(xdgGit, 'ignore'),
  };
}

const verdicts = probes => probes.map(p => [
  p.n,
  p.obs.missingTool || '-',
  p.obs.error ? 'error' : '-',
  p.obs.trap ? String(p.obs.trap.ok) : '-',
  p.obs.guard ? String(p.obs.guard.ok) : '-',
].join(':'));

function environmentInvariance(state) {
  const dir = mkdtempSync(join(tmpdir(), 'verify-traps-hostile-'));
  const saved = { ...process.env };
  try {
    Object.assign(process.env, pollute(dir));
    const again = PROBES.map(p => ({ n: p.n, obs: observe(p) }));
    const before = verdicts(state.probes), after = verdicts(again);
    return { same: before.join('|') === after.join('|'), before, after };
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    rmSync(dir, { recursive: true, force: true });
  }
}

function counterTests(state) {
  const tests = [], withheld = [];
  const EXPECT = { trap: 'trap-not-reproduced', guard: 'guard-does-not-hold' };
  const NAME = {
    trap: n => `trap ${n} recorded as no longer reproducing`,
    guard: n => `the guard for trap ${n} recorded as no longer holding`,
  };
  for (const p of state.probes) {
    if (p.obs.error) { withheld.push(`${p.n} (the probe could not run)`); continue; }
    if (p.obs.missingTool) { withheld.push(`${p.n} (${p.obs.missingTool} absent)`); continue; }
    for (const half of ['trap', 'guard']) {
      if (p.obs[half] && p.obs[half].ok === true) {
        tests.push({ expect: EXPECT[half], name: NAME[half](p.n), mutate: s => flip(s, p.n, half) });
      } else {
        withheld.push(`${p.n} ${half} form (already red — reported below, not re-proved here)`);
      }
    }
  }
  return { tests: [...tests, ...STRUCTURAL_TESTS], withheld };
}

// ---------------------------------------------------------------- run

const state = measure();

// Before anything can fail: which host judged. A log that ends in a self-test
// abort should still say where it ran.
console.log(envLine());

if (process.argv.includes('--self-test')) {
  const base = judge(state);
  const baseline = new Set(base.errors.map(e => e.text));
  const firing = new Set(base.errors.map(e => e.code));
  const { tests, withheld } = counterTests(state);
  let passed = 0;

  // A run that is already red has delivered the proof the self-test exists to
  // extract: this guard can go red, and it did, here, now. What it may not do
  // in that state is argue with itself and exit before saying why — measured
  // twice, on a host with no shells at all and on one where every probe threw:
  // the log named a counter-test that "found nothing to falsify" and never
  // named the finding underneath. So while the untouched run is red, a
  // counter-test that cannot be constructed is withheld and listed rather than
  // fatal, and the report below does the gating. While the untouched run is
  // green, nothing is withheld on this account: every branch must still be
  // proved, or the green is a claim.
  const alreadyRed = base.errors.length > 0;

  for (const [i, test] of tests.entries()) {
    const label = `${i + 1}/${tests.length} "${test.name}"`;
    // A branch that is firing in the untouched run cannot be made to raise a
    // *new* error, and does not need to be: it is already proved reachable, by
    // the run itself. Planting it anyway raises the error that is already in
    // the baseline, the diff comes back empty, and the self-test fails for the
    // one reason that is not a defect.
    if (firing.has(test.expect)) {
      withheld.push(`${test.expect} (already firing in this run — the report below is its proof)`);
      continue;
    }
    const { state: falsified, applied } = test.mutate(state);
    if (!applied) {
      // "Cannot synthesize X" is only a failure while the guard is otherwise
      // green. Run 32744393366 aborted here and the finding underneath — trap
      // 5 gone on that host — never reached the log.
      if (alreadyRed) {
        withheld.push(`${test.expect} (not constructible on this host — nothing left to plant)`);
        continue;
      }
      console.error(`SELF-TEST FAILED: counter-test ${label} found nothing to falsify.`);
      console.error('The check it belongs to is unreachable — most likely the probe it inverts recorded nothing at all.');
      process.exit(1);
    }
    const raised = judge(falsified).errors.filter(e => !baseline.has(e.text));
    const hit = raised.find(e => e.code === test.expect);
    if (!hit) {
      // Same rule as above, at the other end of the counter-test: while the
      // untouched run is red, a counter-test that cannot land is withheld and
      // named, never allowed to replace the finding with a complaint about
      // itself.
      if (alreadyRed) {
        withheld.push(`${test.expect} (could not be planted on this host — the report below stands instead)`);
        continue;
      }
      console.error(`SELF-TEST FAILED: counter-test ${label} did not raise "${test.expect}".`);
      console.error(raised.length ? `It raised: ${raised.map(e => e.code).join(', ')}` : 'It raised no new error at all.');
      console.error('The guard proves nothing here. Fix the guard before trusting it.');
      process.exit(1);
    }
    passed++;
    console.log(`self-test ${label}: ${test.expect}`);
  }

  // A branch already firing in the untouched run needs no synthetic proof that
  // it can fire; it is firing. Anything else without a counter-test is a claim.
  const uncovered = Object.keys(BRANCHES).filter(code => !tests.some(t => t.expect === code) && !firing.has(code));
  if (uncovered.length > 0 && !alreadyRed) {
    console.error(`SELF-TEST FAILED: ${uncovered.length} error branch(es) with neither a counter-test nor a live finding: ${uncovered.join(', ')}`);
    console.error('An untested branch is a claim. Add its counter-test before trusting the guard.');
    process.exit(1);
  }
  for (const code of uncovered) withheld.push(`${code} (branch unproved on this host)`);

  const hostile = environmentInvariance(state);
  if (!hostile.same) {
    console.error('SELF-TEST FAILED: a hostile environment changed the verdicts.');
    console.error('  BASH_ENV, ZDOTDIR, SHELLOPTS=xtrace, CDPATH, GIT_TRACE, XDG_CONFIG_HOME and GIT_CONFIG_* were planted;');
    console.error('  the probes must be unmoved by all of them, because a false red here says "your catalog is stale".');
    for (let i = 0; i < Math.max(hostile.before.length, hostile.after.length); i++) {
      if (hostile.before[i] !== hostile.after[i]) {
        console.error(`  trap ${hostile.before[i] || '(none)'} became ${hostile.after[i] || '(none)'} (n:missingTool:error:trapOk:guardOk)`);
      }
    }
    process.exit(1);
  }
  console.log('self-test invariance: a hostile environment (BASH_ENV, ZDOTDIR, SHELLOPTS=xtrace, CDPATH, GIT_TRACE, XDG_CONFIG_HOME, GIT_CONFIG_*) leaves every verdict unchanged');

  const verdict = withheld.length === 0 ? 'OK' : 'OK, in part';
  console.log(`self-test: ${verdict} — ${passed} of ${tests.length} counter-tests raised an error of their own, covering ${Object.keys(BRANCHES).length - uncovered.length} of ${Object.keys(BRANCHES).length} error branches`
    + (withheld.length > 0 ? `; ${withheld.length} withheld: ${withheld.join(', ')}` : ''));
}

const { errors, report, probed, notProbed, coverage } = judge(state);
for (const line of report) console.log(line.text);
console.log(coverage);
if (errors.length > 0) {
  console.error(`trap verification: RED (${errors.length} error(s))`);
  for (const e of errors) console.error(`  - [${e.code}] ${e.text}`);
  process.exit(1);
}
console.log(`trap verification: OK — ${probed.length} of ${state.numbers.length} catalogued traps reproduced here and were told apart from their remedy; ${notProbed.length} accounted for by reason, none left unaccounted for`);
