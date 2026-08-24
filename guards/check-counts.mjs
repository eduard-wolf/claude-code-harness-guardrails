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
//   which number    `(Trap 11)<!-- trap-ref: 11 YAML -->`
//   means what      Entry 11 must exist and its heading must contain "YAML".
//                   Prose that names catalog numbers is a second register;
//                   without this, renumbering the catalog re-points every
//                   reference silently. It happened here: entry 14 was
//                   inserted into the middle of the catalog, and three
//                   references in each README pointed at their old neighbours
//                   until this check said so.
//
//   which entries   `Traps 11 to 14<!-- trap-group: Claude Code harness = 11-14 -->`
//   form a group    Exactly entries 11..14 must sit between that group heading
//                   and the next one.
//
//   every entry     No marker — a hard invariant: as many `**Guard:**` lines as
//   ends in a       `## N)` entries. That turns "every entry here ends in a
//   guard           guard" from a promise into a measurement.
//
// The catalog is parsed with fenced code blocks skipped. Entry 15 of the
// catalog is about regexes that cannot tell code from prose; a guard reading a
// Markdown file heading by heading is exactly that regex.
//
// Self-test (a guard without a counter-test is a claim, not a guard):
//   node guards/check-counts.mjs --self-test
// runs one counter-test per check against in-memory copies and asserts that
// every one of them turns the guard red.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = 'plugin/skills/tool-traps/SKILL.md';

// Files whose prose may state claims about the catalog. Deliberately not
// examples/: the worked example numbers its own ESLint traps, which are not
// catalog entries.
const PROSE_FILES = ['README.md', 'README.de.md'];

// Registers: name -> function measuring the parsed catalog.
const REGISTERS = {
  traps: c => c.entries.length,
  'trap-groups': c => c.groups.length,
};

const COUNT = /([A-Za-zÄÖÜäöüß]+|\d+)(?:\*\*)?<!--\s*count:([a-z0-9-]+)\s*-->/g;
const TRAP_REF = /<!--\s*trap-ref:\s*(\d+)\s+([^\s>]+?)\s*-->/g;
const TRAP_GROUP = /<!--\s*trap-group:\s*(.+?)\s*=\s*(\d+)\s*-\s*(\d+)\s*-->/g;

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

// One pass over the catalog: `## N)` is an entry, any other `## ` is a group.
function parseCatalog(text) {
  const entries = [], groups = [];
  let guards = 0, inFence = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    if (/^\*\*Guard:\*\*/.test(line)) { guards++; return; }
    const h = /^## (?:(\d+)\)\s*)?(.*)$/.exec(line);
    if (!h) return;
    if (h[1]) entries.push({ n: Number(h[1]), title: h[2].trim(), line: i + 1 });
    else groups.push({ title: h[2].trim(), line: i + 1 });
  });
  return { entries, groups, guards };
}

function check(src) {
  const errors = [];
  const catalog = parseCatalog(src.catalog);

  const measured = {};
  for (const [name, fn] of Object.entries(REGISTERS)) {
    try { measured[name] = fn(catalog); }
    catch (e) { errors.push(`register "${name}": cannot measure artifact (${e.message})`); }
  }

  // Hard invariant, no marker: the catalog's own closing promise.
  if (catalog.guards !== catalog.entries.length) {
    errors.push(`${CATALOG}: ${catalog.entries.length} entr(ies) but ${catalog.guards} "**Guard:**" line(s) — "every entry ends in a guard" is false`);
  }

  const seen = { counts: 0, refs: 0, ranges: 0 };
  const referenced = new Set();

  for (const [file, text] of src.prose) {
    for (const m of text.matchAll(COUNT)) {
      seen.counts++;
      const [, token, register] = m;
      referenced.add(register);
      if (!(register in measured)) { errors.push(`${file}: marker references unknown register "${register}"`); continue; }
      const stated = numberOf(token);
      if (stated === null) { errors.push(`${file}: marked value "${token}" for "${register}" is neither a digit nor a known number word`); continue; }
      if (stated !== measured[register]) {
        errors.push(`${file}: states ${token} for "${register}", artifact measures ${measured[register]}`);
      }
    }

    for (const m of text.matchAll(TRAP_REF)) {
      seen.refs++;
      const n = Number(m[1]), word = m[2];
      const entry = catalog.entries.find(e => e.n === n);
      if (!entry) { errors.push(`${file}: trap-ref ${n} — ${CATALOG} has no entry "## ${n})"`); continue; }
      if (!entry.title.toLowerCase().includes(word.toLowerCase())) {
        errors.push(`${file}: trap-ref ${n} expects "${word}" in the heading, entry ${n} reads "${entry.title}"`);
      }
    }

    for (const m of text.matchAll(TRAP_GROUP)) {
      seen.ranges++;
      const name = m[1], from = Number(m[2]), to = Number(m[3]);
      const at = catalog.groups.findIndex(g => g.title === name);
      if (at === -1) { errors.push(`${file}: trap-group "${name}" — ${CATALOG} has no such group heading`); continue; }
      const start = catalog.groups[at].line;
      const end = at + 1 < catalog.groups.length ? catalog.groups[at + 1].line : Infinity;
      const inside = catalog.entries.filter(e => e.line > start && e.line < end).map(e => e.n);
      const expected = [];
      for (let n = from; n <= to; n++) expected.push(n);
      if (inside.join(',') !== expected.join(',')) {
        errors.push(`${file}: trap-group "${name}" claims ${from}-${to}, ${CATALOG} has [${inside.join(', ')}] under that heading`);
      }
    }
  }

  // A register nobody states is a measurement nobody reads.
  for (const name of Object.keys(REGISTERS)) {
    if (!referenced.has(name)) errors.push(`register "${name}" is never stated in prose — it guards nothing`);
  }
  if (seen.counts === 0) errors.push('no count markers found in prose — the guard guards nothing');

  return { errors, measured, seen, catalog };
}

const sources = {
  catalog: readFileSync(join(ROOT, CATALOG), 'utf8'),
  prose: PROSE_FILES.map(f => [f, readFileSync(join(ROOT, f), 'utf8')]),
};

const copyOf = s => ({ catalog: s.catalog, prose: s.prose.map(([f, t]) => [f, t]) });

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

// One counter-test per check. Each must turn the guard red; a mutation that
// changes nothing counts as a failed self-test, not as a pass.
const COUNTER_TESTS = [
  {
    name: 'stated trap count off by one',
    mutate: src => inFirstProse(src, /([A-Za-zÄÖÜäöüß]+|\d+)((?:\*\*)?<!--\s*count:traps\s*-->)/,
      (_, token, tail) => `${numberOf(token) + 1}${tail}`),
  },
  {
    name: 'stated group count off by one',
    mutate: src => inFirstProse(src, /([A-Za-zÄÖÜäöüß]+|\d+)((?:\*\*)?<!--\s*count:trap-groups\s*-->)/,
      (_, token, tail) => `${numberOf(token) + 1}${tail}`),
  },
  {
    name: 'one "**Guard:**" line removed from the catalog',
    mutate: src => {
      const out = copyOf(src);
      const next = out.catalog.replace(/^\*\*Guard:\*\*.*$/m, '');
      const applied = next !== out.catalog;
      out.catalog = next;
      return { src: out, applied };
    },
  },
  {
    name: 'trap reference pointed at the neighbouring entry',
    mutate: src => inFirstProse(src, /(<!--\s*trap-ref:\s*)(\d+)/,
      (_, head, n) => head + (Number(n) + 1)),
  },
  {
    name: 'group range shifted by one',
    mutate: src => inFirstProse(src, /(<!--\s*trap-group:\s*.+?=\s*)(\d+)(\s*-\s*)(\d+)/,
      (_, head, from, dash, to) => head + (Number(from) + 1) + dash + (Number(to) + 1)),
  },
  {
    name: 'a register left unstated in every prose file',
    mutate: src => {
      const out = copyOf(src);
      let applied = false;
      for (const entry of out.prose) {
        const next = entry[1].replace(/<!--\s*count:trap-groups\s*-->/g, '');
        if (next !== entry[1]) { entry[1] = next; applied = true; }
      }
      return { src: out, applied };
    },
  },
];

if (process.argv.includes('--self-test')) {
  let passed = 0;
  for (const [i, test] of COUNTER_TESTS.entries()) {
    const label = `${i + 1}/${COUNTER_TESTS.length} "${test.name}"`;
    const { src: falsified, applied } = test.mutate(sources);
    if (!applied) {
      console.error(`SELF-TEST FAILED: counter-test ${label} found nothing to falsify.`);
      console.error('The check it belongs to is unreachable. Fix the guard before trusting it.');
      process.exit(1);
    }
    const res = check(falsified);
    if (res.errors.length === 0) {
      console.error(`SELF-TEST FAILED: counter-test ${label} falsified a claim and the guard stayed green.`);
      console.error('The guard proves nothing. Fix the guard before trusting it.');
      process.exit(1);
    }
    passed++;
    console.log(`self-test ${label}: red as required — ${res.errors[0]}`);
  }
  console.log(`self-test: OK — ${passed} of ${COUNTER_TESTS.length} counter-tests turned the guard red`);
}

const { errors, measured, seen, catalog } = check(sources);
if (errors.length > 0) {
  console.error(`stated counts: RED (${errors.length} error(s))`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const registers = Object.entries(measured).map(([k, v]) => `${k}=${v}`).join(', ');
console.log(`stated counts: OK — ${seen.counts} count marker(s) against measured ${registers}; ${seen.refs} trap reference(s), ${seen.ranges} group range(s), ${catalog.guards} guard line(s) for ${catalog.entries.length} entries`);
