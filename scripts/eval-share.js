#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LOAD_GRADER = /^loads-/;
const TURN_LIMIT = /Reached maximum number of turns/;
const MIN_RUNS = 3;
const DEFAULT_THRESHOLD = 0.8;
const CASES_DIR = path.join(__dirname, '..', 'evals', 'router');

function loadShare(result, expectedCases) {
  if (result.partial) throw new Error('the run is partial: a cost ceiling stopped it, so its scores are incomplete');
  const measured = new Set(result.cases.map((c) => c.name));
  const missing = expectedCases.filter((name) => !measured.has(name));
  if (missing.length > 0) throw new Error(`the result holds no run of ${missing.join(', ')}`);
  const byLanguage = {};
  for (const evalCase of result.cases) {
    const caseRuns = evalCase.arms.with;
    if (caseRuns.length < MIN_RUNS) throw new Error(`${evalCase.name} ran ${caseRuns.length} times, fewer than three runs`);
    const share = (byLanguage[evalCase.name.split('-')[0]] ??= { loaded: 0, runs: 0 });
    for (const run of caseRuns) {
      if (run.error && !TURN_LIMIT.test(run.error)) throw new Error(`a run of ${evalCase.name} ended in an error: ${run.error}`);
      const grader = run.graders.find((g) => LOAD_GRADER.test(g.name));
      if (!grader) throw new Error(`a run of ${evalCase.name} carries no load grader`);
      share.runs++;
      if (grader.passed) share.loaded++;
    }
  }
  return byLanguage;
}

const stdio = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

// node scripts/eval-share.js <result.json> [threshold]
function main([resultPath, thresholdArg], io = stdio) {
  if (!resultPath) {
    io.err('usage: node scripts/eval-share.js <result.json> [threshold]\n');
    return 1;
  }
  const threshold = thresholdArg === undefined ? DEFAULT_THRESHOLD : Number(thresholdArg);
  if (!(threshold >= 0 && threshold <= 1)) {
    io.err(`the threshold ${thresholdArg} is no number from 0 to 1\n`);
    return 1;
  }
  let byLanguage;
  try {
    byLanguage = loadShare(JSON.parse(fs.readFileSync(resultPath, 'utf8')), fs.readdirSync(CASES_DIR));
  } catch (error) {
    io.err(`${error.message}\n`);
    return 1;
  }
  let reached = true;
  for (const [language, { loaded, runs }] of Object.entries(byLanguage)) {
    const rate = loaded / runs;
    reached &&= rate >= threshold;
    io.out(`${language}: loaded the expected skill in ${loaded} of ${runs} runs (${rate.toFixed(2)})\n`);
  }
  io.out(`threshold ${threshold} for every language: ${reached ? 'reached' : 'missed'}\n`);
  return reached ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { loadShare, main };
