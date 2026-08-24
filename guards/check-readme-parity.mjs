#!/usr/bin/env node
// Guard: README.md and README.de.md must carry the same sections in the same
// order.
//
// Two language versions are two registers of the same content. Registers drift.
// This guard makes the drift visible the moment it happens, in CI, not months later.
//
// Mechanism (measure the mechanism, not the name): every section heading in both
// READMEs is preceded by an invisible anchor comment `<!-- section: slug -->`.
// The guard compares the two anchor sequences. It does NOT compare prose — a
// translation may word things differently; it may not drop, add, or reorder
// sections silently.
//
// Self-test (a guard without a counter-test is a claim, not a guard):
//   node guards/check-readme-parity.mjs --self-test
// One counter-test per error branch, each asserted to raise *its own* error.
// The earlier version asserted only "some error appeared" and never checked
// that its mutation had applied. Measured against planted input: with
// README.de.md stripped of every anchor, the mutation became a no-op, the
// pre-existing errors were counted as proof, and the self-test reported
// "OK — removing one anchor turns the guard red (9 error(s) raised)" while
// proving nothing at all.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['README.md', 'README.de.md'];
const ANCHOR = /<!--\s*section:\s*([a-z0-9-]+)\s*-->/g;

// Every error this guard can raise; the self-test refuses to pass while one of
// them has no counter-test.
const BRANCHES = {
  'no-anchors': 'a file with no section anchors at all',
  'missing-section': 'a section present in one file and not the other',
  'order-differs': 'the same sections in a different order',
  'duplicate-anchor': 'the same anchor twice in one file',
};

function anchorsOf(text) {
  return [...text.matchAll(ANCHOR)].map(m => m[1]);
}

function compare(aName, a, bName, b) {
  const errors = [];
  const fail = (code, text) => errors.push({ code, text });
  if (a.length === 0) fail('no-anchors', `${aName}: no section anchors found at all`);
  if (b.length === 0) fail('no-anchors', `${bName}: no section anchors found at all`);
  const setA = new Set(a), setB = new Set(b);
  for (const s of a) if (!setB.has(s)) fail('missing-section', `missing in ${bName}: "${s}"`);
  for (const s of b) if (!setA.has(s)) fail('missing-section', `missing in ${aName}: "${s}"`);
  if (errors.length === 0 && a.join('\n') !== b.join('\n')) {
    // At this point both files hold the same set, so a length difference means
    // a repeated anchor. Name the end of a sequence instead of printing
    // "undefined" at it.
    const at = (arr, i) => (i < arr.length ? `"${arr[i]}"` : '(nothing — sequence ends here)');
    let i = a.findIndex((s, k) => s !== b[k]);
    if (i === -1) i = Math.min(a.length, b.length);
    fail('order-differs', `order differs at position ${i + 1}: ${aName} has ${at(a, i)}, ${bName} has ${at(b, i)}`);
  }
  const dupA = a.filter((s, i) => a.indexOf(s) !== i);
  const dupB = b.filter((s, i) => b.indexOf(s) !== i);
  for (const d of new Set(dupA)) fail('duplicate-anchor', `duplicate anchor in ${aName}: "${d}"`);
  for (const d of new Set(dupB)) fail('duplicate-anchor', `duplicate anchor in ${bName}: "${d}"`);
  return errors;
}

function run(texts) {
  const [a, b] = texts.map(anchorsOf);
  return compare(FILES[0], a, FILES[1], b);
}

const texts = FILES.map(f => readFileSync(join(ROOT, f), 'utf8'));

const dropAll = t => t.replace(new RegExp(ANCHOR.source, 'g'), '');

function swapFirstTwo(text) {
  const ms = [...text.matchAll(ANCHOR)];
  if (ms.length < 2) return text;
  const [x, y] = ms;
  return text.slice(0, x.index) + y[0]
    + text.slice(x.index + x[0].length, y.index) + x[0]
    + text.slice(y.index + y[0].length);
}

function duplicateFirst(text) {
  const m = new RegExp(ANCHOR.source).exec(text);
  if (!m) return text;
  return text.slice(0, m.index + m[0].length) + '\n' + m[0] + text.slice(m.index + m[0].length);
}

// `mutate` receives the two texts and returns the two mutated texts.
const COUNTER_TESTS = [
  { expect: 'missing-section', name: 'one anchor removed from README.de.md',
    mutate: ([a, b]) => [a, b.replace(new RegExp(ANCHOR.source), '')] },
  { expect: 'missing-section', name: 'one anchor removed from README.md',
    mutate: ([a, b]) => [a.replace(new RegExp(ANCHOR.source), ''), b] },
  { expect: 'no-anchors', name: 'every anchor removed from README.de.md',
    mutate: ([a, b]) => [a, dropAll(b)] },
  { expect: 'order-differs', name: 'two anchors swapped in README.de.md',
    mutate: ([a, b]) => [a, swapFirstTwo(b)] },
  { expect: 'duplicate-anchor', name: 'one anchor repeated in README.md',
    mutate: ([a, b]) => [duplicateFirst(a), b] },
];

if (process.argv.includes('--self-test')) {
  const baseline = new Set(run(texts).map(e => e.text));
  let passed = 0;
  for (const [i, test] of COUNTER_TESTS.entries()) {
    const label = `${i + 1}/${COUNTER_TESTS.length} "${test.name}"`;
    const mutated = test.mutate(texts);
    if (mutated[0] === texts[0] && mutated[1] === texts[1]) {
      console.error(`SELF-TEST FAILED: counter-test ${label} found nothing to falsify.`);
      console.error('The check it belongs to is unreachable. Fix the guard before trusting it.');
      process.exit(1);
    }
    const raised = run(mutated).filter(e => !baseline.has(e.text));
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
    process.exit(1);
  }
  console.log(`self-test: OK — ${passed} counter-tests for ${Object.keys(BRANCHES).length} error branches, each raising its own error`);
}

const errors = run(texts);
if (errors.length > 0) {
  console.error(`README parity: RED (${errors.length} error(s))`);
  for (const e of errors) console.error(`  - [${e.code}] ${e.text}`);
  process.exit(1);
}
const n = anchorsOf(texts[0]).length;
console.log(`README parity: OK — ${n} sections, same set, same order in ${FILES.join(' and ')}`);
