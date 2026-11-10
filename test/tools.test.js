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
  const expected = { folder, instructions: 'Use the imperative.\n', inside: [] };
  assert.deepStrictEqual(tools.loadSkill({ path: found.path }), expected);
  assert.deepStrictEqual(tools.loadSkill({ path: folder }), expected);
});

const writeNamed = (base, relative, name) => {
  fs.mkdirSync(path.join(base, relative), { recursive: true });
  fs.writeFileSync(path.join(base, relative, 'SKILL.md'), `---\nname: ${name}\ndescription: Apply when ${name} work is done\n---\n`);
};
const insideOf = (tools, folder) => tools.loadSkill({ path: folder }).inside.map((r) => r.name);

test('lists as narrower only skills of the same skill folder root, in the order of their names', () => {
  const root = path.join(dir, 'roots');
  const write = (relative, name) => writeNamed(root, relative, name);
  write('dev-skill', 'dev-skill');
  write(path.join('dev-skill', 'zeta'), 'zeta');
  write(path.join('dev-skill', 'alpha'), 'alpha');
  write(path.join('dev-skill', '.agents', 'skills', 'other'), 'other');
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }, { folder: path.join(root, 'dev-skill', '.agents', 'skills'), source: 'project' }] });
  const inside = tools.loadSkill({ path: path.join(root, 'dev-skill') }).inside.map((r) => r.name);
  assert.deepStrictEqual(inside, ['alpha', 'zeta']);
});

test('lists no skill under the skills whose folders link to it where its own folder lies inside the root, whatever the order of names', () => {
  for (const store of ['astore', 'zstore']) {
    const root = path.join(dir, `link-order-${store}`);
    const write = (relative, name) => writeNamed(root, relative, name);
    write('mobile', 'mobile');
    write('web', 'web');
    write(path.join(store, 'kite'), 'kite');
    fs.symlinkSync(path.join(root, store, 'kite'), path.join(root, 'mobile', 'kite'), 'junction');
    fs.symlinkSync(path.join(root, store, 'kite'), path.join(root, 'web', 'kite'), 'junction');
    const tools = createTools({ roots: () => [{ folder: root, source: 'user' }] });
    const inside = ['mobile', 'web'].map((parent) => tools.loadSkill({ path: path.join(root, parent) }).inside.map((r) => r.name));
    assert.deepStrictEqual(inside, [[], []], store);
  }
});

test('lists no skill a link back to its own folder or an ancestor reaches, so no skill lists itself or the skill above it', () => {
  const root = path.join(dir, 'link-cycles');
  writeNamed(root, 'a', 'a');
  writeNamed(root, path.join('a', 'b'), 'b');
  writeNamed(root, 's', 's');
  fs.symlinkSync(path.join(root, 'a'), path.join(root, 'a', 'b', 'up'), 'junction');
  fs.symlinkSync(path.join(root, 's'), path.join(root, 's', 'self'), 'junction');
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }] });
  assert.deepStrictEqual(['a', path.join('a', 'b'), 's'].map((f) => insideOf(tools, path.join(root, f))), [['b'], [], []]);
});

test('lists no skill whose folder holds the skill\'s own, though a chain of links leads back into it', () => {
  const root = path.join(dir, 'link-chain-back');
  writeNamed(root, 'a', 'a');
  writeNamed(root, path.join('a', 'b'), 'b');
  fs.mkdirSync(path.join(root, 'hub'), { recursive: true });
  fs.symlinkSync(path.join(root, 'hub'), path.join(root, 'a', 'b', 'via'), 'junction');
  fs.symlinkSync(path.join(root, 'a'), path.join(root, 'hub', 'back'), 'junction');
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }] });
  assert.deepStrictEqual(['a', path.join('a', 'b')].map((f) => insideOf(tools, path.join(root, f))), [['b'], []]);
});

test('lists a skill below a SKILL.md the index leaves out under the skill above, by the path through that folder', () => {
  const root = path.join(dir, 'left-out');
  writeNamed(root, 'm', 'm');
  writeNamed(root, path.join('m', 'big', 'leaf'), 'leaf');
  fs.writeFileSync(path.join(root, 'm', 'big', 'SKILL.md'), `---\nname: big\n---\n${'x'.repeat(1024 * 1024)}\n`);
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }] });
  const [{ nodes: [top] }] = tools.skillTree();
  assert.deepStrictEqual([insideOf(tools, path.join(root, 'm')), top.children.map((c) => c.rel)], [['leaf'], [path.join('big', 'leaf')]]);
});

test('lists neither of two skills linked into each other\'s folders under the other, both standing at their own folders', () => {
  const root = path.join(dir, 'link-mutual');
  writeNamed(root, 'a', 'a');
  writeNamed(root, 'b', 'b');
  fs.symlinkSync(path.join(root, 'b'), path.join(root, 'a', 'to-b'), 'junction');
  fs.symlinkSync(path.join(root, 'a'), path.join(root, 'b', 'to-a'), 'junction');
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }] });
  assert.deepStrictEqual(['a', 'b'].map((f) => insideOf(tools, path.join(root, f))), [[], []]);
});

test('lists as narrower only a skill the load takes, though a link puts it in a root that does not hide its name', () => {
  const user = path.join(dir, 'loadable-user');
  const project = path.join(dir, 'loadable-project');
  const codex = path.join(dir, 'loadable-codex');
  writeNamed(user, 'dup', 'dup');
  writeNamed(project, path.join('store', 'dup'), 'dup');
  writeNamed(codex, 'parent', 'parent');
  fs.symlinkSync(path.join(project, 'store', 'dup'), path.join(codex, 'parent', 'dup'), 'junction');
  const roots = [{ folder: user, source: 'user' }, { folder: project, source: 'project', hiddenBy: 'user' }, { folder: codex, source: 'codex' }];
  const tools = createTools({ roots: () => roots });
  assert.deepStrictEqual(insideOf(tools, path.join(codex, 'parent')), []);
});

test('lists the nearest level where two roots cover the same folders', () => {
  const root = path.join(dir, 'overlapping-roots');
  writeNamed(root, 'top', 'top');
  writeNamed(root, path.join('top', 'group', 'mid'), 'mid');
  writeNamed(root, path.join('top', 'group', 'mid', 'leaf'), 'leaf');
  const tools = createTools({ roots: () => [{ folder: root, source: 'user' }, { folder: path.join(root, 'top', 'group'), source: 'plugin' }] });
  assert.deepStrictEqual([insideOf(tools, path.join(root, 'top')), insideOf(tools, path.join(root, 'top', 'group', 'mid'))], [['mid'], ['leaf']]);
});

test('hides a skill linked into a root that hides its name, as a copy stored there would be', () => {
  const user = path.join(dir, 'alias-user');
  const project = path.join(dir, 'alias-project');
  writeNamed(user, 'ops', 'ops');
  writeNamed(project, 'team', 'team');
  writeNamed(project, path.join('team', 'roster'), 'roster');
  fs.symlinkSync(path.join(user, 'ops'), path.join(project, 'team', 'ops'), 'junction');
  const tools = createTools({ roots: () => [{ folder: user, source: 'user' }, { folder: project, source: 'project', hiddenBy: 'user' }] });
  assert.deepStrictEqual(insideOf(tools, path.join(project, 'team')), ['roster']);
});

test('lists a skill below a hidden skill under the skill above it, by the path through the hidden skill\'s folder', () => {
  const user = path.join(dir, 'hidden-user');
  const project = path.join(dir, 'hidden-project');
  const write = writeNamed;
  write(user, 'ops', 'ops');
  write(project, 'team', 'team');
  write(project, path.join('team', 'ops'), 'ops');
  write(project, path.join('team', 'ops', 'runbook'), 'runbook');
  write(project, path.join('team', 'roster'), 'roster');
  const tools = createTools({ roots: () => [{ folder: user, source: 'user' }, { folder: project, source: 'project', hiddenBy: 'user' }] });
  assert.deepStrictEqual(tools.loadSkill({ path: path.join(project, 'team') }).inside.map((r) => r.name), ['roster', 'runbook']);
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

test('load refuses every path that is not an installed skill', () => {
  const refused = [
    path.join(dir, 'outside', 'secret', 'SKILL.md'),
    path.join(skillsDir, 'commit-rules', 'references', 'types.md'),
    path.join(skillsDir, 'commit-rules', '..', '..', 'outside', 'secret', 'SKILL.md'),
    path.join(skillsDir, 'missing', 'SKILL.md'),
    '',
  ];
  for (const requested of refused) {
    assert.throws(() => tools.loadSkill({ path: requested }), /no installed skill at this path/, requested);
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
  assert.throws(() => grown.loadSkill({ path: found.path }), /no installed skill at this path/);
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
  const expected = { folder, instructions: 'Shared body.\n', inside: [] };
  const loaded = [path.join(root, 'foo', 'SKILL.md'), path.join(root, 'foo')].map((requested) => linked.loadSkill({ path: requested }));
  assert.deepStrictEqual(loaded, [expected, expected]);
  assert.throws(() => linked.loadSkill({ path: shared }), /no installed skill at this path/);
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
