#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LOAD_GRADER = /^loads-/;
const ABSENCE_GRADER = /^loads-no-/;
const TURN_LIMIT = /Reached maximum number of turns/;
const MIN_RUNS = 3;
const DEFAULT_THRESHOLD = 0.8;
const CASES_DIR = path.join(__dirname, '..', 'evals', 'router');

function loadShare(result, expectedCases) {
  if (result.partial) throw new Error('the run is partial: a cost ceiling stopped it, so its scores are incomplete');
  const measured = new Set(result.cases.map((c) => c.name));
  const missing = expectedCases.filter((name) => !measured.has(name));
  if (missing.length > 0) throw new Error(`the result holds no run of ${missing.join(', ')}`);
  const byGroup = {};
  for (const evalCase of result.cases) {
    const caseRuns = evalCase.arms.with;
    if (caseRuns.length < MIN_RUNS) throw new Error(`${evalCase.name} ran ${caseRuns.length} times, fewer than three runs`);
    const share = (byGroup[evalCase.name.split('-')[0]] ??= { passed: 0, runs: 0 });
    for (const run of caseRuns) {
      if (run.error && !TURN_LIMIT.test(run.error)) throw new Error(`a run of ${evalCase.name} ended in an error: ${run.error}`);
      const graders = run.graders.filter((g) => LOAD_GRADER.test(g.name));
      if (graders.length === 0) throw new Error(`a run of ${evalCase.name} carries no load grader`);
      share.runs++;
      const passesOnAbsence = graders.every((g) => ABSENCE_GRADER.test(g.name));
      if (graders.every((g) => g.passed) && !(passesOnAbsence && TURN_LIMIT.test(run.error ?? ''))) share.passed++;
    }
  }
  return byGroup;
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
  let byGroup;
  try {
    byGroup = loadShare(JSON.parse(fs.readFileSync(resultPath, 'utf8')), fs.readdirSync(CASES_DIR));
  } catch (error) {
    io.err(`${error.message}\n`);
    return 1;
  }
  let reached = true;
  for (const [group, { passed, runs }] of Object.entries(byGroup)) {
    const rate = passed / runs;
    reached &&= rate >= threshold;
    io.out(`${group}: passed in ${passed} of ${runs} runs (${rate.toFixed(2)})\n`);
  }
  io.out(`threshold ${threshold} for every group of cases: ${reached ? 'reached' : 'missed'}\n`);
  return reached ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { loadShare, main };
