'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTools } = require('../src/tools');

let dir;
let skillsDir;
let tools;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-tools-'));
  skillsDir = path.join(dir, 'skills');
  const write = (relative, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, relative)), { recursive: true });
    fs.writeFileSync(path.join(dir, relative), text);
  };
  write('skills/commit-rules/SKILL.md', '---\nname: commit-rules\ndescription: Apply when writing commit messages\n---\nUse the imperative.\n');
  write('skills/commit-rules/references/types.md', 'feat, fix\n');
  write('outside/secret/SKILL.md', '---\nname: secret\ndescription: Not indexed\n---\nHidden.\n');
  tools = createTools({ roots: () => [{ folder: skillsDir, source: 'test' }], projectDir: dir });
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('search returns the matching skills with name, path and description', () => {
  const results = tools.searchSkills({ query: 'commit message' });
  assert.deepStrictEqual(results, [{
    name: 'commit-rules',
    path: fs.realpathSync.native(path.join(skillsDir, 'commit-rules', 'SKILL.md')),
    description: 'Apply when writing commit messages',
  }]);
});

test('load returns the SKILL.md of a skill the search returned and the path of its folder', () => {
  const [found] = tools.searchSkills({ query: 'commit' });
  const folder = path.dirname(found.path);
  const expected = { folder, content: fs.readFileSync(found.path, 'utf8') };
  assert.deepStrictEqual(tools.loadSkill({ path: found.path }), expected);
  assert.deepStrictEqual(tools.loadSkill({ path: folder }), expected);
});

test('load refuses every path that is not a skill of the index', () => {
  const refused = [
    path.join(dir, 'outside', 'secret', 'SKILL.md'),
    path.join(skillsDir, 'commit-rules', 'references', 'types.md'),
    path.join(skillsDir, 'commit-rules', '..', '..', 'outside', 'secret', 'SKILL.md'),
    path.join(skillsDir, 'missing', 'SKILL.md'),
    '',
  ];
  for (const requested of refused) {
    assert.throws(() => tools.loadSkill({ path: requested }), /not a skill of the index/, requested);
  }
});

test('load refuses a SKILL.md that grew beyond 1 MiB after the index read its size', (t) => {
  const root = path.join(dir, 'grown');
  const file = path.join(root, 'notes', 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '---\nname: notes\ndescription: Apply when notes are written\n---\nKeep them short.\n');
  const grown = createTools({ roots: () => [{ folder: root, source: 'test' }] });
  const [found] = grown.searchSkills({ query: 'notes' });
  const statSync = fs.statSync;
  const indexed = statSync(file);
  fs.appendFileSync(file, 'x'.repeat(1024 * 1024));
  t.mock.method(fs, 'statSync', (target, ...rest) => (path.basename(String(target)) === 'SKILL.md' ? indexed : statSync(target, ...rest)));
  assert.throws(() => grown.loadSkill({ path: found.path }), /not a skill of the index/);
});

test('load accepts an indexed skill however its path is spelled', () => {
  const spellings = [
    `${skillsDir.split(path.sep).join('/')}/commit-rules/SKILL.md`,
    path.join(skillsDir, 'commit-rules', '.', 'SKILL.md'),
    path.join(skillsDir, 'commit-rules'),
  ];
  for (const requested of spellings) {
    assert.match(tools.loadSkill({ path: requested }).content, /Use the imperative/, requested);
  }
});

test('search reads no SKILL.md again that is unchanged since the previous search', () => {
  const folder = path.join(dir, 'cached-skills');
  const file = path.join(folder, 'notes', 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '---\nname: notes\ndescription: Apply when notes aaaa are written\n---\n');
  const mtime = new Date(2026, 0, 1);
  fs.utimesSync(file, mtime, mtime);
  const cached = createTools({ roots: () => [{ folder, source: 'test' }], projectDir: dir });
  cached.searchSkills({ query: 'notes' });
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('aaaa', 'bbbb'));
  fs.utimesSync(file, mtime, mtime);
  assert.deepStrictEqual(cached.searchSkills({ query: 'notes' }).map((r) => r.description), ['Apply when notes aaaa are written']);
});
