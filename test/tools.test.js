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
  tools = createTools({ roots: () => [{ folder: skillsDir, source: 'test' }] });
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('search returns the matching skills, each name with the path and description of its skills', () => {
  const results = tools.searchSkills({ query: 'commit message' });
  assert.deepStrictEqual(results, [{
    name: 'commit-rules',
    skills: [{ path: fs.realpathSync.native(path.join(skillsDir, 'commit-rules', 'SKILL.md')), description: 'Apply when writing commit messages' }],
  }]);
});

test('load returns the instructions of a skill the search returned, without its frontmatter, and its folder', () => {
  const [found] = tools.searchSkills({ query: 'commit' }).map((r) => r.skills[0]);
  const folder = path.dirname(found.path);
  const expected = { folder, instructions: 'Use the imperative.\n' };
  assert.deepStrictEqual(tools.loadSkill({ path: found.path }), expected);
  assert.deepStrictEqual(tools.loadSkill({ path: folder }), expected);
});

test('load drops the frontmatter of a SKILL.md as the index reads it, a byte order mark and CRLF line ends included', () => {
  const root = path.join(dir, 'bom');
  fs.mkdirSync(path.join(root, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'notes', 'SKILL.md'), '﻿---\r\nname: notes\r\ndescription: Apply when notes are written\r\n---\r\n\r\nKeep them short.\r\n');
  const bom = createTools({ roots: () => [{ folder: root, source: 'test' }] });
  assert.strictEqual(bom.loadSkill({ path: path.join(root, 'notes') }).instructions, 'Keep them short.\n');
});

test('shows a path inside the home folder from ~, and loads a skill by that path', () => {
  const homed = createTools({ roots: () => [{ folder: skillsDir, source: 'test' }], home: dir });
  const shown = homed.shownPath(path.join(skillsDir, 'commit-rules'));
  assert.deepStrictEqual([shown, homed.loadSkill({ path: shown }).instructions],
    [`~${path.sep}skills${path.sep}commit-rules`, 'Use the imperative.\n']);
});

test('shows a path outside the home folder as it is, a sibling whose name starts as the home name included', () => {
  const target = path.join(skillsDir, 'commit-rules');
  const shown = [path.join(dir, 'home'), path.join(dir, 'sk')].map((home) => createTools({ roots: () => [], home }).shownPath(target));
  assert.deepStrictEqual(shown, [target, target]);
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
  const [found] = grown.searchSkills({ query: 'notes' }).map((r) => r.skills[0]);
  const statSync = fs.statSync;
  const indexed = statSync(file);
  fs.appendFileSync(file, 'x'.repeat(1024 * 1024));
  t.mock.method(fs, 'statSync', (target, ...rest) => (path.basename(String(target)) === 'SKILL.md' ? indexed : statSync(target, ...rest)));
  assert.throws(() => grown.loadSkill({ path: found.path }), /not a skill of the index/);
});

test('search returns every skill of one name in a folder in one result, at any depth', () => {
  const root = path.join(dir, 'same-name');
  const write = (relative, name, description) => {
    fs.mkdirSync(path.join(root, relative), { recursive: true });
    fs.writeFileSync(path.join(root, relative, 'SKILL.md'), `---
name: ${name}
description: ${description}
---
Body.
`);
    return fs.realpathSync.native(path.join(root, relative, 'SKILL.md'));
  };
  const collector = write('release-notes', 'release-notes', 'Collects the merged pull requests since the last tag');
  const writer = write('documents/release-notes', 'release-notes', 'Writes customer-facing release notes for a product version');
  const current = write('triage', 'triage', 'Triages the issues of a tracker');
  const archived = write('v1/triage', 'triage', 'Triages the issues of a tracker');
  const tools = createTools({ roots: () => [{ folder: root, source: 'test' }] });
  const found = (query) => tools.searchSkills({ query }).map((r) => [r.name, r.skills.map((s) => s.path).sort()]);
  assert.deepStrictEqual([found('customer-facing release notes'), found('triage issues')], [
    [['release-notes', [collector, writer].sort()]],
    [['triage', [current, archived].sort()]],
  ]);
});

test('load accepts an indexed skill however its path is spelled', () => {
  const spellings = [
    `${skillsDir.split(path.sep).join('/')}/commit-rules/SKILL.md`,
    path.join(skillsDir, 'commit-rules', '.', 'SKILL.md'),
    path.join(skillsDir, 'commit-rules'),
  ];
  for (const requested of spellings) {
    assert.match(tools.loadSkill({ path: requested }).instructions, /Use the imperative/, requested);
  }
});

test('load returns the text a SKILL.md link leads to with the folder of the link, by the link and by that folder', (t) => {
  const root = path.join(dir, 'file-link');
  const shared = path.join(dir, 'store', 'shared.md');
  fs.mkdirSync(path.dirname(shared), { recursive: true });
  fs.writeFileSync(shared, '---\nname: shared\ndescription: Apply when shared notes are written\n---\nShared body.\n');
  fs.mkdirSync(path.join(root, 'foo'), { recursive: true });
  try {
    fs.symlinkSync(shared, path.join(root, 'foo', 'SKILL.md'), 'file');
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('this account may not create file links');
    throw error;
  }
  const linked = createTools({ roots: () => [{ folder: root, source: 'test' }] });
  const folder = path.join(fs.realpathSync.native(root), 'foo');
  const expected = { folder, instructions: 'Shared body.\n' };
  const loaded = [path.join(root, 'foo', 'SKILL.md'), path.join(root, 'foo')].map((requested) => linked.loadSkill({ path: requested }));
  assert.deepStrictEqual(loaded, [expected, expected]);
  assert.throws(() => linked.loadSkill({ path: shared }), /not a skill of the index/);
});

test('search reads no SKILL.md again that is unchanged since the previous search', () => {
  const folder = path.join(dir, 'cached-skills');
  const file = path.join(folder, 'notes', 'SKILL.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '---\nname: notes\ndescription: Apply when notes aaaa are written\n---\n');
  const mtime = new Date(2026, 0, 1);
  fs.utimesSync(file, mtime, mtime);
  const cached = createTools({ roots: () => [{ folder, source: 'test' }] });
  cached.searchSkills({ query: 'notes' });
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('aaaa', 'bbbb'));
  fs.utimesSync(file, mtime, mtime);
  assert.deepStrictEqual(cached.searchSkills({ query: 'notes' }).map((r) => r.skills[0].description), ['Apply when notes aaaa are written']);
});
