'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../scripts/build-eval-root');
const { parseSkillFile } = require('../src/frontmatter');

const repo = path.join(__dirname, '..');
let dir;
let root;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-eval-root-'));
  root = build(repo, dir);
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('holds the router and starts it on the skills folder of the root', () => {
  for (const file of ['server.js', 'src/router.js', 'hooks/hooks.json', '.claude-plugin/plugin.json']) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  const server = JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')).mcpServers['skill-router'];
  assert.deepStrictEqual(server.args, ['${CLAUDE_PLUGIN_ROOT}/server.js', '${CLAUDE_PLUGIN_ROOT}/skills']);
});

test('stores each catalog skill at its path with its name, description and metadata', () => {
  const catalog = require('./fixtures/catalog/skills.json');
  for (const skill of catalog) {
    const { data } = parseSkillFile(fs.readFileSync(path.join(root, 'skills', skill.path), 'utf8'));
    assert.deepStrictEqual(
      [data.name, data.description, data.metadata ?? {}],
      [skill.name, skill.description, skill.metadata ?? {}],
      skill.path,
    );
  }
});

test('carries the eval cases of the repository', () => {
  const cases = fs.readdirSync(path.join(repo, 'evals', 'router'));
  assert.ok(cases.length > 0);
  for (const name of cases) assert.ok(fs.existsSync(path.join(root, 'evals', 'router', name, 'prompt.md')), name);
});

test('refuses an output folder inside the repository', () => {
  assert.throws(() => build(repo, path.join(repo, 'build-here')), /inside the repository/);
  assert.throws(() => build(repo, path.join(repo, '..out')), /inside the repository/);
});

test('rebuilds its own previous root and refuses to remove a folder it did not build', () => {
  assert.strictEqual(build(repo, dir), root);
  const foreign = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-foreign-'));
  try {
    fs.mkdirSync(path.join(foreign, 'skill-router-eval'));
    fs.writeFileSync(path.join(foreign, 'skill-router-eval', 'keep.txt'), 'mine');
    assert.throws(() => build(repo, foreign), /did not build/);
    assert.ok(fs.existsSync(path.join(foreign, 'skill-router-eval', 'keep.txt')));
  } finally {
    fs.rmSync(foreign, { recursive: true, force: true });
  }
});
