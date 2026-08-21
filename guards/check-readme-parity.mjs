#!/usr/bin/env node
// Guard: README.md and README.de.md must carry the same sections in the same order.
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
// removes one anchor from a copy in memory and asserts the check turns red.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['README.md', 'README.de.md'];
const ANCHOR = /<!--\s*section:\s*([a-z0-9-]+)\s*-->/g;

function anchorsOf(text) {
  return [...text.matchAll(ANCHOR)].map(m => m[1]);
}

function compare(aName, a, bName, b) {
  const errors = [];
  if (a.length === 0) errors.push(`${aName}: no section anchors found at all`);
  if (b.length === 0) errors.push(`${bName}: no section anchors found at all`);
  const setA = new Set(a), setB = new Set(b);
  for (const s of a) if (!setB.has(s)) errors.push(`missing in ${bName}: "${s}"`);
  for (const s of b) if (!setA.has(s)) errors.push(`missing in ${aName}: "${s}"`);
  if (errors.length === 0 && a.join('\n') !== b.join('\n')) {
    const i = a.findIndex((s, k) => s !== b[k]);
    errors.push(`order differs at position ${i + 1}: ${aName} has "${a[i]}", ${bName} has "${b[i]}"`);
  }
  const dupA = a.filter((s, i) => a.indexOf(s) !== i);
  const dupB = b.filter((s, i) => b.indexOf(s) !== i);
  for (const d of new Set(dupA)) errors.push(`duplicate anchor in ${aName}: "${d}"`);
  for (const d of new Set(dupB)) errors.push(`duplicate anchor in ${bName}: "${d}"`);
  return errors;
}

function run(texts) {
  const [a, b] = texts.map(anchorsOf);
  return compare(FILES[0], a, FILES[1], b);
}

const texts = FILES.map(f => readFileSync(join(ROOT, f), 'utf8'));

if (process.argv.includes('--self-test')) {
  // Counter-test: strip the first anchor from the second file; the check MUST fail.
  const mutated = [texts[0], texts[1].replace(/<!--\s*section:\s*[a-z0-9-]+\s*-->/, '')];
  const mutatedErrors = run(mutated);
  if (mutatedErrors.length === 0) {
    console.error('SELF-TEST FAILED: removed an anchor and the guard stayed green.');
    console.error('The guard proves nothing. Fix the guard before trusting it.');
    process.exit(1);
  }
  console.log(`self-test: OK — removing one anchor turns the guard red (${mutatedErrors.length} error(s) raised)`);
}

const errors = run(texts);
if (errors.length > 0) {
  console.error(`README parity: RED (${errors.length} error(s))`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const n = anchorsOf(texts[0]).length;
console.log(`README parity: OK — ${n} sections, same set, same order in ${FILES.join(' and ')}`);
