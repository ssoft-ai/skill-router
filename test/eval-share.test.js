'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadShare, main } = require('../scripts/eval-share');

const run = (loaded, error = null) => ({ error, graders: [{ name: 'loads-x', passed: loaded }] });
const evalCase = (name, runs) => ({ name, runsPerCase: runs.length, arms: { with: runs } });
const result = (partial, ...cases) => ({ partial, cases });
const three = (...loaded) => loaded.map((l) => run(l));
const full = (firstRuns) => result(false, evalCase('en-a', firstRuns), evalCase('de-a', three(true, true, true)));
const expected = ['en-a', 'de-a'];

test('counts the runs whose load grader passed, per language of the case name', () => {
  assert.deepStrictEqual(loadShare(full(three(true, false, true)), expected), {
    en: { passed: 2, runs: 3 },
    de: { passed: 3, runs: 3 },
  });
});

test('counts a run the turn limit stopped, whose graders still scored it', () => {
  const stopped = 'exit 1: Reached maximum number of turns (6)';
  const share = loadShare(full([run(true, stopped), run(false, stopped), run(true)]), expected);
  assert.deepStrictEqual(share.en, { passed: 2, runs: 3 });
});

test('refuses a partial run or a run that ended in another error', () => {
  assert.throws(() => loadShare({ ...full(three(true, true, true)), partial: true }, expected), /partial/);
  assert.throws(() => loadShare(full([run(true, 'timeout'), run(true), run(true)]), expected), /error/);
});

test('counts a run as passed only when every load grader of the run passed', () => {
  const twoGraders = (second) => ({ error: null, graders: [{ name: 'loads-no-skill', passed: true }, { name: 'loads-no-listed-skill', passed: second }] });
  const share = loadShare(result(false, evalCase('none-a', [twoGraders(true), twoGraders(false), twoGraders(true)])), ['none-a']);
  assert.deepStrictEqual(share.none, { passed: 2, runs: 3 });
});

test('counts no run the turn limit stopped as passed where every load grader passes on a load not made', () => {
  const stopped = 'exit 1: Reached maximum number of turns (6)';
  const absent = (error) => ({ error, graders: [{ name: 'loads-no-skill', passed: true }, { name: 'loads-no-listed-skill', passed: true }] });
  const share = loadShare(result(false, evalCase('none-a', [absent(stopped), absent(null), absent(null)])), ['none-a']);
  assert.deepStrictEqual(share.none, { passed: 2, runs: 3 });
});

test('refuses a case whose run carries no load grader', () => {
  const noGrader = { error: null, graders: [{ name: 'other', passed: true }] };
  assert.throws(() => loadShare(full([noGrader, run(true), run(true)]), expected), /load grader/);
});

test('refuses a result with fewer than three runs of a case or without every case', () => {
  assert.throws(() => loadShare(full([run(true)]), expected), /three runs/);
  assert.throws(() => loadShare(result(false, evalCase('en-a', three(true, true, true))), expected), /de-a/);
});

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-share-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('reports the share of passed runs for each group of cases, the nested skills and the requests no skill applies to included', () => {
  const file = path.join(dir, 'groups.json');
  const names = fs.readdirSync(path.join(__dirname, '..', 'evals', 'router'));
  fs.writeFileSync(file, JSON.stringify(result(false, ...names.map((name) => evalCase(name, three(true, true, true))))));
  let out = '';
  main([file], { out: (text) => { out += text; }, err: () => {} });
  assert.deepStrictEqual(['nested', 'none', 'en'].map((group) => new RegExp(`^${group}: passed in \\d+ of \\d+ runs`, 'm').test(out)), [true, true, true]);
});

test('exits 0 only when every language reaches the threshold, and 1 on a threshold that is no number', () => {
  const file = path.join(dir, 'result.json');
  const names = fs.readdirSync(path.join(__dirname, '..', 'evals', 'router'));
  const firstOfEnglish = names.find((name) => name.startsWith('en-'));
  const cases = names.map((name) => evalCase(name, three(name !== firstOfEnglish, true, true)));
  fs.writeFileSync(file, JSON.stringify(result(false, ...cases)));
  const quiet = { out: () => {}, err: () => {} };
  const englishShare = (3 * names.filter((n) => n.startsWith('en-')).length - 1) / (3 * names.filter((n) => n.startsWith('en-')).length);
  assert.deepStrictEqual(
    [main([file, String(englishShare)], quiet), main([file, '1'], quiet), main([file, '80%'], quiet)],
    [0, 1, 1],
  );
});
