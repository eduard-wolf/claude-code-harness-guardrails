#!/usr/bin/env node
// Guard: every claim the prose makes about the trap catalog must equal the
// catalog itself.
//
// A number in a document is a claim. This repository's origin story includes a
// document that said "237 briefs" where the measured corpus held 262 files and
// 85 briefs — the claim had simply never been counted. This guard makes that
// error class impossible here: prose never carries a free-floating count; it
// carries a marked count, and CI re-measures the artifact on every push.
//
// The READMEs make four kinds of claim about the catalog. Each has its own
// mechanism here, and the single source of truth for all of them is SKILL.md:
//
//   how many        `**15**<!-- count:traps -->`, `six<!-- count:trap-groups -->`
//                   A marked number — digits or a number word, English or
//                   German — against a register that measures the file.
//
//                   One register, `guards`, counts `guards/*.mjs` instead of
//                   reading the catalog. That looks like a different kind of
//                   check and is the same error class: "All three guards run
//                   their counter-test first" is a claim about this repository
//                   that anybody can re-measure and that nothing was
//                   re-measuring. It was written when the third guard arrived,
//                   it was true that day, and a fourth guard would have left
//                   it quietly wrong — which is the sentence this whole file
//                   exists to make impossible. The register reads the
//                   directory, not a list of names, so adding a guard is
//                   enough to move it.
//
//   which number    `(Trap 11)<!-- trap-ref: 11 YAML -->`
//   means what      The number in the marker must equal the number the reader
//                   sees, entry 11 must exist, and its heading must contain
//                   "YAML" as a whole word. Prose that names catalog numbers is
//                   a second register; without this, renumbering the catalog
//                   re-points every reference silently. It happened here: entry
//                   14 was inserted into the middle of the catalog, and three
//                   references in each README pointed at their old neighbours
//                   until this check said so. And because a guard that only
//                   checks what someone remembered to mark is a habit rather
//                   than a guard, every `(Trap N)` / `(Falle N)` in prose must
//                   carry such a marker in the first place.
//
//   which entries   `Traps 11 to 14<!-- trap-group: Claude Code harness = 11-14 -->`
//   form a group    Exactly those entries must sit between that group heading
//                   and the next one.
//
//   every entry     No marker — a hard invariant: as many `**Guard:**` lines as
//   ends in a       `## N)` entries. That turns "every entry here ends in a
//   guard           guard" from a promise into a measurement.
//
//   every entry     The catalog's other unmarked promise, measured the same
//   carries a       way. Rule 2 of its preamble says "every trap carries a
//   dated stamp     verification date and environment", both READMEs repeat it
//                   twice over, and the issue form sends reporters to go read
//                   that date. Said everywhere, counted nowhere — so a hostile
//                   read of v1.0.0 did the arithmetic this file should have
//                   been doing and found two of fifteen entries without a date:
//                   entry 3 with no stamp line at all, entry 13 with a stamp
//                   carrying a binary version instead of one. So: between an
//                   entry's heading and the next heading there must be a line
//                   opening `**Verified` or `**Measured` that carries a
//                   `YYYY-MM` or `YYYY-MM-DD` date. Missing line and undated
//                   line are two errors, not one, because they are two
//                   different repairs.
//
//                   The date has to sit on the stamp line itself. A reflow that
//                   pushes it onto the next line turns this red without a
//                   measurement having gone missing — which is why the error
//                   names the entry and says which of the two cases it is. The
//                   alternative, scanning the whole paragraph, buys reflow
//                   tolerance by giving up on knowing which line it certified.
//
// Two rules learned by measuring this guard against planted input, after a
// review found four ways to stay green while measuring nothing:
//
//   A marker that is nearly right is louder than one that is missing. Every
//   HTML comment whose body starts with one of this guard's prefixes must match
//   that marker's strict form. `<!-- trap-ref: -->` and `<!-- count:Traps -->`
//   used to be invisible: no pattern matched them, so nothing was checked and
//   nothing complained. Malformed markers are now their own error.
//
//   Line endings are content. `split('\n')` leaves a `\r` on every line, `$`
//   then matches nothing, and a CRLF checkout measured zero entries against
//   fifteen guard lines — red, but for a reason that reads like a broken
//   catalog. Everything is normalised on the way in.
//
// The catalog is parsed with fenced code blocks skipped. Entry 15 of the
// catalog is about regexes that cannot tell code from prose, and a guard
// reading a Markdown file heading by heading is exactly that regex.
//
// Self-test (a guard without a counter-test is a claim, not a guard):
//   node guards/check-counts.mjs --self-test
// runs one counter-test per error branch and asserts that each raises *its own*
// error — an error the untouched tree does not already have. Accepting "some
// error appeared" would let one unrelated red check pass every counter-test at
// once; measured here, it did. It then asserts that no error branch is left
// without a counter-test, and finally that a CRLF copy of the catalog measures
// exactly what the LF original measures.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = 'plugin/skills/tool-traps/SKILL.md';

// Files whose prose may state claims about the catalog. Deliberately not
// examples/: the worked example numbers its own ESLint traps, which are not
// catalog entries. docs/ is the other case, and it is worth saying plainly
// rather than leaving it to look deliberate: it is out of reach, not out of
// scope. docs/method.md counts the sections of a file in this repository with
// no marker and no register behind it — this guard's own error class, sitting
// one directory outside its reach.
const PROSE_FILES = ['README.md', 'README.de.md'];

// Registers: name -> function measuring the sources. `traps` and `trap-groups`
// read the parsed catalog; `guards` reads the guards directory (see header).
// Both arguments are passed in rather than read here, so `check()` stays a pure
// function of its input and the self-test can falsify either.
const REGISTERS = {
  traps: (c, src) => c.entries.length,
  'trap-groups': (c, src) => c.groups.length,
  guards: (c, src) => src.guardFiles.length,
  // The guard counting itself. The READMEs describe how many unmarked checks
  // this file holds; that sentence said "one" from the day it was written
  // until the day a second one arrived, and nothing noticed. Now the number
  // reads the branch list.
  'catalog-checks': (c, src) => Object.keys(BRANCHES).filter(k => k.startsWith('catalog-')).length,
};

// Every error this guard can raise. The self-test refuses to pass while one of
// these has no counter-test, so the list cannot quietly grow past its proof.
const BRANCHES = {
  'catalog-guard-count': 'catalog has a different number of **Guard:** lines than entries',
  'catalog-guard-missing': 'a catalog entry that ends in no **Guard:** line of its own',
  'catalog-stamp-missing': 'a catalog entry carrying no verification stamp line at all',
  'catalog-stamp-undated': 'a catalog entry whose stamp line carries no date',
  'marker-malformed': 'a comment starts like one of our markers but does not match its form',
  'count-unbound': 'a count marker with no number in front of it',
  'count-unknown-register': 'a count marker naming a register this guard does not measure',
  'count-not-a-number': 'a marked value that is neither a digit nor a known number word',
  'count-mismatch': 'a stated count differing from the measured one',
  'ref-unmarked': 'a (Trap N) in prose with no trap-ref marker behind it',
  'ref-number-mismatch': 'the number the reader sees differs from the number in the marker',
  'ref-no-entry': 'a trap-ref pointing at an entry the catalog does not have',
  'ref-word-missing': 'a trap-ref whose word is not in the entry heading it points at',
  'group-no-heading': 'a trap-group naming a group heading the catalog does not have',
  'group-range': 'a trap-group whose range is not what sits under that heading',
  'register-unstated': 'a register no prose file states',
  'no-count-markers': 'no count markers in prose at all',
};

// Comments this guard owns. Anything matching the loose prefix must match the
// strict form; see the header.
const COMMENT = /<!--([\s\S]*?)-->/g;
const OURS = /^(count|trap-ref|trap-group)\s*:/i;
const STRICT = {
  count: /^count\s*:\s*([a-z0-9-]+)$/,
  'trap-ref': /^trap-ref\s*:\s*(\d+)\s+([A-Za-z0-9]{3,})$/,
  'trap-group': /^trap-group\s*:\s*(.+?)\s*=\s*(\d+)\s*-\s*(\d+)$/,
};
// The number belonging to a count marker sits in front of it. Bold optional,
// whitespace (a reflowed line break included) tolerated.
const COUNT_TOKEN = /(?:\*\*)?([A-Za-zÄÖÜäöüß]+|\d+)(?:\*\*)?\s*$/;
// Rule 2 of the catalog's preamble, in machine form: a stamp opens its line and
// carries its date on that same line. `**Re-measured` and `**Version note` are
// deliberately not stamps — they annotate an entry that must already have one.
const STAMP = /^\*\*(?:Verified|Measured)\b/;
// A date, not merely its shape. The loose form accepted `1200-08` — a line
// range — as a verification date, which a review demonstrated.
const STAMP_DATE = /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?\b/;
const REFERENCE = /\((?:Trap|Falle)\s+(\d+)\)/g;
const REF_BEHIND = /^\s*<!--\s*trap-ref\s*:\s*(\d+)\b/;

// Prose writes small numbers as words; forcing digits would make the guard's
// reach depend on typography. Anything not listed here fails loudly.
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6,
  sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
};

function numberOf(token) {
  if (/^\d+$/.test(token)) return Number(token);
  const word = NUMBER_WORDS[token.toLowerCase()];
  return word === undefined ? null : word;
}

const lf = text => text.replace(/\r\n?/g, '\n');

// One pass over the catalog: `## N)` is an entry, any other `## ` is a group.
// Stamp lines are attributed to the entry they sit under; a group heading ends
// that entry's reach, so a stamp under a group intro belongs to no entry.
function parseCatalog(text) {
  const entries = [], groups = [];
  let guards = 0, inFence = false, open = null;
  lf(text).split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    if (/^\*\*Guard:\*\*/.test(line)) { guards++; if (open) open.guards++; return; }
    if (open && STAMP.test(line)) {
      open.stamps++;
      if (STAMP_DATE.test(line)) open.dated++;
      return;
    }
    const h = /^## (?:(\d+)\)\s*)?(.*)$/.exec(line);
    if (!h) return;
    if (h[1]) {
      open = { n: Number(h[1]), title: h[2].trim(), line: i + 1, guards: 0, stamps: 0, dated: 0 };
      entries.push(open);
    } else {
      open = null;
      groups.push({ title: h[2].trim(), line: i + 1 });
    }
  });
  return { entries, groups, guards };
}

function check(src) {
  const errors = [];
  const fail = (code, text) => errors.push({ code, text });
  const catalog = parseCatalog(src.catalog);

  const measured = {};
  for (const [name, fn] of Object.entries(REGISTERS)) measured[name] = fn(catalog, src);

  // Hard invariant, no marker: the catalog's own closing promise.
  if (catalog.guards !== catalog.entries.length) {
    fail('catalog-guard-count', `${CATALOG}: ${catalog.entries.length} entr(ies) but ${catalog.guards} "**Guard:**" line(s) — "every entry ends in a guard" is false`);
  }

  // A file-wide tally is not the promise. Moving one entry's guard paragraph
  // into its neighbour keeps 15 = 15 while an entry ends in nothing; a review
  // did exactly that and watched all three guards stay green.
  for (const e of catalog.entries) {
    if (e.guards === 0) {
      fail('catalog-guard-missing', `${CATALOG}: entry ${e.n} ends in no "**Guard:**" line of its own — the file-wide tally can still come out even while one entry ends in nothing and another ends in two`);
    }
  }

  // The other one, per entry so the red names the entry to repair.
  for (const e of catalog.entries) {
    if (e.stamps === 0) {
      fail('catalog-stamp-missing', `${CATALOG}: entry ${e.n} carries no "**Verified…" or "**Measured…" line — nothing here dates it`);
    } else if (e.dated === 0) {
      fail('catalog-stamp-undated', `${CATALOG}: entry ${e.n} has a stamp line but no YYYY-MM or YYYY-MM-DD date on it — an undated stamp is the next stale claim`);
    }
  }

  const seen = { counts: 0, refs: 0, ranges: 0 };
  const referenced = new Set();

  for (const [file, raw] of src.prose) {
    const text = lf(raw);

    for (const m of text.matchAll(COMMENT)) {
      const body = m[1].trim();
      const kind = OURS.exec(body);
      if (!kind) continue;
      const strict = STRICT[kind[1].toLowerCase()].exec(body);
      if (!strict) {
        fail('marker-malformed', `${file}: <!--${m[1]}--> starts like a "${kind[1].toLowerCase()}" marker but does not match its form`);
        continue;
      }

      if (kind[1].toLowerCase() === 'count') {
        const register = strict[1];
        referenced.add(register);
        const before = COUNT_TOKEN.exec(text.slice(0, m.index));
        if (!before) { fail('count-unbound', `${file}: marker for "${register}" has no number in front of it`); continue; }
        seen.counts++;
        if (!(register in measured)) { fail('count-unknown-register', `${file}: marker references unknown register "${register}"`); continue; }
        const stated = numberOf(before[1]);
        if (stated === null) { fail('count-not-a-number', `${file}: marked value "${before[1]}" for "${register}" is neither a digit nor a known number word`); continue; }
        if (stated !== measured[register]) {
          fail('count-mismatch', `${file}: states ${before[1]} for "${register}", artifact measures ${measured[register]}`);
        }
        continue;
      }

      if (kind[1].toLowerCase() === 'trap-ref') {
        seen.refs++;
        const n = Number(strict[1]), word = strict[2];
        const entry = catalog.entries.find(e => e.n === n);
        if (!entry) { fail('ref-no-entry', `${file}: trap-ref ${n} — ${CATALOG} has no entry "## ${n})"`); continue; }
        // Whole word, not substring: "a" used to match almost any heading.
        if (!new RegExp(`\\b${word}\\b`, 'i').test(entry.title)) {
          fail('ref-word-missing', `${file}: trap-ref ${n} expects "${word}" as a word in the heading, entry ${n} reads "${entry.title}"`);
        }
        continue;
      }

      seen.ranges++;
      const name = strict[1], from = Number(strict[2]), to = Number(strict[3]);
      const at = catalog.groups.findIndex(g => g.title === name);
      if (at === -1) { fail('group-no-heading', `${file}: trap-group "${name}" — ${CATALOG} has no such group heading`); continue; }
      const start = catalog.groups[at].line;
      const end = at + 1 < catalog.groups.length ? catalog.groups[at + 1].line : Infinity;
      const inside = catalog.entries.filter(e => e.line > start && e.line < end).map(e => e.n);
      const expected = [];
      for (let n = from; n <= to; n++) expected.push(n);
      if (inside.join(',') !== expected.join(',')) {
        fail('group-range', `${file}: trap-group "${name}" claims ${from}-${to}, ${CATALOG} has [${inside.join(', ')}] under that heading`);
      }
    }

    // A marker only guards the reference it sits behind, and only if it names
    // the same number the reader sees.
    for (const m of text.matchAll(REFERENCE)) {
      const behind = REF_BEHIND.exec(text.slice(m.index + m[0].length));
      if (!behind) { fail('ref-unmarked', `${file}: "${m[0]}" carries no <!-- trap-ref: ${m[1]} <word> --> marker — the reference is unguarded`); continue; }
      if (behind[1] !== m[1]) {
        fail('ref-number-mismatch', `${file}: "${m[0]}" is marked <!-- trap-ref: ${behind[1]} … --> — the number the reader sees is not the one being checked`);
      }
    }
  }

  // A register nobody states is a measurement nobody reads.
  for (const name of Object.keys(REGISTERS)) {
    if (!referenced.has(name)) fail('register-unstated', `register "${name}" is never stated in prose — it guards nothing`);
  }
  if (seen.counts === 0) fail('no-count-markers', 'no count markers found in prose — the guard guards nothing');

  return { errors, measured, seen, catalog };
}

const sources = {
  catalog: readFileSync(join(ROOT, CATALOG), 'utf8'),
  prose: PROSE_FILES.map(f => [f, readFileSync(join(ROOT, f), 'utf8')]),
  // The directory, not a list of names: a guard added tomorrow counts itself.
  guardFiles: readdirSync(join(ROOT, 'guards')).filter(f => f.endsWith('.mjs')),
};

const copyOf = s => ({
  catalog: s.catalog,
  prose: s.prose.map(([f, t]) => [f, t]),
  guardFiles: [...s.guardFiles],
});

// Falsify in the first prose file that carries the claim; one wrong register is
// enough to demand red.
function inFirstProse(src, re, replacer) {
  const out = copyOf(src);
  for (const entry of out.prose) {
    const next = entry[1].replace(re, replacer);
    if (next !== entry[1]) { entry[1] = next; return { src: out, applied: true }; }
  }
  return { src: out, applied: false };
}

function inEveryProse(src, re, replacer) {
  const out = copyOf(src);
  let applied = false;
  for (const entry of out.prose) {
    const next = entry[1].replace(re, replacer);
    if (next !== entry[1]) { entry[1] = next; applied = true; }
  }
  return { src: out, applied };
}

function inCatalog(src, re, replacer) {
  const out = copyOf(src);
  const next = out.catalog.replace(re, replacer);
  const applied = next !== out.catalog;
  out.catalog = next;
  return { src: out, applied };
}

// One counter-test per error branch. `expect` is the branch it must raise; a
// mutation that changes nothing, or that raises only errors the untouched tree
// already had, is a failed self-test rather than a passed one.
const COUNTER_TESTS = [
  { expect: 'catalog-guard-count', name: 'one "**Guard:**" line removed from the catalog',
    mutate: src => inCatalog(src, /^\*\*Guard:\*\*.*$/m, '') },

  // Totals unchanged, one entry stripped: the counter-test for the hole a
  // whole-file tally cannot see.
  { expect: 'catalog-guard-missing', name: "one entry's guard line moved into its neighbour, totals unchanged",
    mutate: src => {
      const out = copyOf(src);
      const first = /^\*\*Guard:\*\*.*$/m.exec(out.catalog);
      const all = [...out.catalog.matchAll(/^\*\*Guard:\*\*.*$/gm)];
      if (!first || all.length < 2) return { src: out, applied: false };
      const last = all[all.length - 1];
      let text = out.catalog.slice(0, last.index) + out.catalog.slice(last.index + last[0].length);
      text = text.slice(0, first.index) + first[0] + '\n' + text.slice(first.index);
      out.catalog = text;
      return { src: out, applied: true };
    } },

  { expect: 'catalog-stamp-missing', name: 'one stamp line removed from the catalog',
    mutate: src => inCatalog(src, /^\*\*(?:Verified|Measured)\b.*$/m, '') },

  { expect: 'catalog-stamp-undated', name: 'the date taken out of a stamp line',
    mutate: src => inCatalog(src, /^(\*\*(?:Verified|Measured)\b.*?)\b\d{4}-\d{2}(?:-\d{2})?\b/m, '$1') },

  // Proves the attribution rule the parser claims: a stamp under a group
  // heading belongs to no entry, so it cannot cover the entry below it.
  { expect: 'catalog-stamp-missing', name: 'a stamp moved out of its entry into the group intro above it',
    mutate: src => {
      const out = copyOf(src);
      const stamp = /^\*\*(?:Verified|Measured)\b.*$/m.exec(out.catalog);
      if (!stamp) return { src: out, applied: false };
      let text = out.catalog.slice(0, stamp.index) + out.catalog.slice(stamp.index + stamp[0].length);
      const group = /^## (?!\d+\))(.*)$/m.exec(text);
      if (!group || group.index > stamp.index) return { src: out, applied: false };
      const at = group.index + group[0].length;
      out.catalog = text.slice(0, at) + '\n\n' + stamp[0] + text.slice(at);
      return { src: out, applied: true };
    } },

  { expect: 'marker-malformed', name: 'a marker with its prefix but no payload',
    mutate: src => inFirstProse(src, /<!--\s*trap-ref:[^>]*-->/, '<!-- trap-ref: -->') },

  // A reflow that leaves the marker behind punctuation instead of its number.
  { expect: 'count-unbound', name: 'a count marker with its number taken away',
    mutate: src => inFirstProse(src, /(?:\*\*)?\d+(?:\*\*)?(<!--\s*count:traps\s*-->)/, '.\n$1') },

  { expect: 'count-unknown-register', name: 'a count marker naming a register nobody measures',
    mutate: src => inFirstProse(src, /(<!--\s*count:)traps(\s*-->)/, '$1trapz$2') },

  { expect: 'count-not-a-number', name: 'a marked value that is not a number at all',
    mutate: src => inFirstProse(src, /(?:\*\*)?\d+(?:\*\*)?(<!--\s*count:traps\s*-->)/, 'plenty$1') },

  { expect: 'count-mismatch', name: 'stated trap count off by one',
    mutate: src => inFirstProse(src, /([A-Za-zÄÖÜäöüß]+|\d+)((?:\*\*)?<!--\s*count:traps\s*-->)/,
      (_, token, tail) => `${numberOf(token) + 1}${tail}`) },

  { expect: 'count-mismatch', name: 'stated group count off by one',
    mutate: src => inFirstProse(src, /([A-Za-zÄÖÜäöüß]+|\d+)((?:\*\*)?<!--\s*count:trap-groups\s*-->)/,
      (_, token, tail) => `${numberOf(token) + 1}${tail}`) },

  // The guards register is the one that measures the file system, so it gets
  // its counter-test from both ends: the prose can be wrong about the
  // directory, and the directory can move under the prose.
  { expect: 'count-mismatch', name: 'stated guard count off by one',
    mutate: src => inFirstProse(src, /([A-Za-zÄÖÜäöüß]+|\d+)((?:\*\*)?<!--\s*count:guards\s*-->)/,
      (_, token, tail) => `${numberOf(token) + 1}${tail}`) },

  { expect: 'count-mismatch', name: 'a fourth guard added to the directory, prose unchanged',
    mutate: src => {
      const out = copyOf(src);
      out.guardFiles = [...out.guardFiles, 'check-something-new.mjs'];
      return { src: out, applied: true };
    } },

  { expect: 'ref-unmarked', name: 'a catalog reference left without its marker',
    mutate: src => inFirstProse(src, /\s*<!--\s*trap-ref:[^>]*-->/, '') },

  { expect: 'ref-number-mismatch', name: 'the visible number moved away from its marker',
    mutate: src => inFirstProse(src, /\((Trap|Falle) (\d+)\)(<!--\s*trap-ref:\s*)(\d+)/,
      (_, word, visible, head, marked) => `(${word} ${Number(visible) + 1})${head}${marked}`) },

  { expect: 'ref-no-entry', name: 'a trap-ref pointing past the end of the catalog',
    mutate: src => inFirstProse(src, /(<!--\s*trap-ref:\s*)(\d+)(\s+[A-Za-z0-9]+\s*-->)/,
      (_, head, n, tail) => `${head}${Number(n) + 900}${tail}`) },

  { expect: 'ref-word-missing', name: 'trap reference pointed at the neighbouring entry',
    mutate: src => inFirstProse(src, /\((Trap|Falle) (\d+)\)(<!--\s*trap-ref:\s*)(\d+)/,
      (_, word, visible, head, marked) => `(${word} ${Number(visible) + 1})${head}${Number(marked) + 1}`) },

  { expect: 'group-no-heading', name: 'a trap-group naming a heading that is not there',
    mutate: src => inFirstProse(src, /(<!--\s*trap-group:\s*)([^=]+?)(\s*=)/, '$1Claude Code harnesses$3') },

  { expect: 'group-range', name: 'group range shifted by one',
    mutate: src => inFirstProse(src, /(<!--\s*trap-group:\s*.+?=\s*)(\d+)(\s*-\s*)(\d+)/,
      (_, head, from, dash, to) => head + (Number(from) + 1) + dash + (Number(to) + 1)) },

  { expect: 'register-unstated', name: 'a register left unstated in every prose file',
    mutate: src => inEveryProse(src, /<!--\s*count:trap-groups\s*-->/g, '') },

  { expect: 'no-count-markers', name: 'every count marker removed from prose',
    mutate: src => inEveryProse(src, /<!--\s*count:[a-z0-9-]+\s*-->/g, '') },
];

// Not every property is proved by making the guard red. These must leave it
// green and measuring exactly the same thing.
const INVARIANCE_TESTS = [
  {
    name: 'a CRLF catalog measures what the LF catalog measures',
    transform: src => ({ ...copyOf(src), catalog: src.catalog.replace(/\r?\n/g, '\r\n') }),
  },
  {
    name: 'a reflowed line break between a number and its marker still counts',
    transform: src => {
      const out = copyOf(src);
      out.prose[0][1] = out.prose[0][1].replace(/(<!--\s*count:traps\s*-->)/, '\n$1');
      return out;
    },
  },
];

if (process.argv.includes('--self-test')) {
  const base = check(sources);
  const baseline = new Set(base.errors.map(e => e.text));
  let passed = 0;

  for (const [i, test] of COUNTER_TESTS.entries()) {
    const label = `${i + 1}/${COUNTER_TESTS.length} "${test.name}"`;
    const { src: falsified, applied } = test.mutate(sources);
    if (!applied) {
      console.error(`SELF-TEST FAILED: counter-test ${label} found nothing to falsify.`);
      console.error('The check it belongs to is unreachable. Fix the guard before trusting it.');
      process.exit(1);
    }
    const raised = check(falsified).errors.filter(e => !baseline.has(e.text));
    const hit = raised.find(e => e.code === test.expect);
    if (!hit) {
      console.error(`SELF-TEST FAILED: counter-test ${label} did not raise "${test.expect}".`);
      console.error(raised.length ? `It raised: ${raised.map(e => e.code).join(', ')}` : 'It raised no new error at all.');
      console.error('The guard proves nothing here. Fix the guard before trusting it.');
      process.exit(1);
    }
    passed++;
    console.log(`self-test ${label}: ${test.expect} — ${hit.text}`);
  }

  const uncovered = Object.keys(BRANCHES).filter(code => !COUNTER_TESTS.some(t => t.expect === code));
  if (uncovered.length > 0) {
    console.error(`SELF-TEST FAILED: ${uncovered.length} error branch(es) without a counter-test: ${uncovered.join(', ')}`);
    console.error('An untested branch is a claim. Add its counter-test before trusting the guard.');
    process.exit(1);
  }

  for (const [i, test] of INVARIANCE_TESTS.entries()) {
    const label = `${i + 1}/${INVARIANCE_TESTS.length} "${test.name}"`;
    const res = check(test.transform(sources));
    const same = JSON.stringify(res.measured) === JSON.stringify(base.measured)
      && res.seen.counts === base.seen.counts && res.errors.length === base.errors.length;
    if (!same) {
      console.error(`SELF-TEST FAILED: invariance test ${label} changed the measurement.`);
      console.error(`  before: ${JSON.stringify(base.measured)} / ${base.seen.counts} count marker(s) / ${base.errors.length} error(s)`);
      console.error(`  after:  ${JSON.stringify(res.measured)} / ${res.seen.counts} count marker(s) / ${res.errors.length} error(s)`);
      process.exit(1);
    }
    console.log(`self-test invariance ${label}: unchanged`);
  }

  console.log(`self-test: OK — ${passed} counter-tests for ${Object.keys(BRANCHES).length} error branches, each raising its own error, plus ${INVARIANCE_TESTS.length} invariance test(s)`);
}

const { errors, measured, seen, catalog } = check(sources);
if (errors.length > 0) {
  console.error(`stated counts: RED (${errors.length} error(s))`);
  for (const e of errors) console.error(`  - [${e.code}] ${e.text}`);
  process.exit(1);
}
const registers = Object.entries(measured).map(([k, v]) => `${k}=${v}`).join(', ');
// Counted per entry, not per line: entry 14 carries a second stamp for its
// second symptom, so the file holds more stamp lines than the invariant needs.
// The surplus is printed rather than absorbed.
const stamped = catalog.entries.filter(e => e.dated > 0).length;
const stampLines = catalog.entries.reduce((n, e) => n + e.stamps, 0);
const extra = catalog.entries.filter(e => e.stamps > 1).map(e => e.n);
const surplus = stampLines === stamped ? ''
  : ` (one each; ${stampLines} in the file, with a second on entr${extra.length === 1 ? 'y' : 'ies'} ${extra.join(', ')})`;
console.log(`stated counts: OK — ${seen.counts} count marker(s) against measured ${registers}; ${seen.refs} trap reference(s), ${seen.ranges} group range(s), ${catalog.guards} guard line(s) for ${catalog.entries.length} entries, ${stamped} stamp line(s) for ${catalog.entries.length} entries${surplus}`);
