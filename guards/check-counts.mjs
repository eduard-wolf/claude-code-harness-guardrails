#!/usr/bin/env node
// Guard: every count stated in prose must equal the count measured in the artifact.
//
// A number in a document is a claim. This repository's origin story includes a
// document that said "237 briefs" where the measured corpus held 262 files and
// 85 briefs — the claim had simply never been counted. This guard makes that
// error class impossible here: prose never carries a free-floating count; it
// carries a marked count, and CI re-measures the artifact on every push.
//
// Mechanism: the single source of truth for "how many traps" is the traps file
// itself (its `## `-level entries). Prose states the number as
//     12<!-- count:traps --> traps          (bold allowed: **12**<!-- count:traps -->)
// The guard counts the artifact, finds every marker, and compares.
//
// Self-test (a guard without a counter-test is a claim, not a guard):
//   node guards/check-counts.mjs --self-test
// alters one marked number in memory and asserts the check turns red.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Registers: name -> function measuring the artifact.
const REGISTERS = {
  traps: () => {
    const t = readFileSync(join(ROOT, 'plugin', 'skills', 'tool-traps', 'SKILL.md'), 'utf8');
    return t.split('\n').filter(l => /^## \d+\)/.test(l)).length;
  },
};

// Files whose prose may state counts.
const PROSE_FILES = ['README.md', 'README.de.md'];

const MARKER = /(\d+)(?:\*\*)?<!--\s*count:([a-z0-9-]+)\s*-->/g;

function check(proseTexts) {
  const errors = [];
  const measured = {};
  for (const [name, fn] of Object.entries(REGISTERS)) {
    try { measured[name] = fn(); }
    catch (e) { errors.push(`register "${name}": cannot measure artifact (${e.message})`); }
  }
  let markers = 0;
  for (const [file, text] of proseTexts) {
    for (const m of text.matchAll(MARKER)) {
      markers++;
      const stated = Number(m[1]);
      const reg = m[2];
      if (!(reg in measured)) { errors.push(`${file}: marker references unknown register "${reg}"`); continue; }
      if (stated !== measured[reg]) {
        errors.push(`${file}: states ${stated} for "${reg}", artifact measures ${measured[reg]}`);
      }
    }
  }
  if (markers === 0) errors.push('no count markers found in prose — the guard guards nothing');
  return { errors, measured, markers };
}

const proseTexts = PROSE_FILES.map(f => [f, readFileSync(join(ROOT, f), 'utf8')]);

if (process.argv.includes('--self-test')) {
  // Counter-test: add 1 to the first marked number; the check MUST fail.
  const mutated = proseTexts.map(([f, t]) => [f, t]);
  let mutatedOne = false;
  for (let i = 0; i < mutated.length && !mutatedOne; i++) {
    mutated[i][1] = mutated[i][1].replace(/(\d+)((?:\*\*)?<!--\s*count:[a-z0-9-]+\s*-->)/, (_, n, rest) => {
      mutatedOne = true;
      return String(Number(n) + 1) + rest;
    });
  }
  const res = check(mutated);
  if (!mutatedOne) {
    console.error('SELF-TEST FAILED: found no marked number to mutate.');
    process.exit(1);
  }
  if (res.errors.length === 0) {
    console.error('SELF-TEST FAILED: falsified a stated count and the guard stayed green.');
    console.error('The guard proves nothing. Fix the guard before trusting it.');
    process.exit(1);
  }
  console.log(`self-test: OK — falsifying one stated count turns the guard red (${res.errors.length} error(s) raised)`);
}

const { errors, measured, markers } = check(proseTexts);
if (errors.length > 0) {
  console.error(`stated counts: RED (${errors.length} error(s))`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`stated counts: OK — ${markers} marker(s) checked against measured ${Object.entries(measured).map(([k, v]) => `${k}=${v}`).join(', ')}`);
