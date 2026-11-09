'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildIndex } = require('../src/index');

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-index-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

function writeSkill(folder, name, description = `Use for ${name}.`) {
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'SKILL.md');
  fs.writeFileSync(file, `---\nname: ${name}\ndescription: ${description}\n---\n\nBody of ${name}.\n`);
  return fs.realpathSync.native(file);
}

test('holds every SKILL.md under a folder, at any depth', () => {
  const root = path.join(dir, 'depth');
  const top = writeSkill(path.join(root, 'top'), 'top');
  const deep = writeSkill(path.join(root, 'top', 'mid', 'deep'), 'deep');
  const index = buildIndex([{ folder: root, source: 'test' }]);
  assert.deepStrictEqual(
    index.skills.map((s) => [s.name, s.path]).sort(),
    [['deep', deep], ['top', top]],
  );
});

test('holds the instructions of a skill, the text below its frontmatter', () => {
  writeSkill(path.join(dir, 'body', 'notes'), 'notes');
  const index = buildIndex([{ folder: path.join(dir, 'body'), source: 'test' }]);
  assert.deepStrictEqual(index.skills.map((s) => s.body), ['\nBody of notes.\n']);
});

function rewriteKeepingTime(file, text, mtime) {
  fs.writeFileSync(file, text);
  fs.utimesSync(file, mtime, mtime);
}

test('reads no SKILL.md again whose time and size are unchanged since the previous index', () => {
  const file = writeSkill(path.join(dir, 'cached', 'notes'), 'notes', 'Use for aaaa.');
  const mtime = new Date(2026, 0, 1);
  fs.utimesSync(file, mtime, mtime);
  const cache = new Map();
  buildIndex([{ folder: path.join(dir, 'cached'), source: 'test' }], { cache });
  rewriteKeepingTime(file, fs.readFileSync(file, 'utf8').replace('aaaa', 'bbbb'), mtime);
  const index = buildIndex([{ folder: path.join(dir, 'cached'), source: 'test' }], { cache });
  assert.deepStrictEqual(index.skills.map((s) => s.description), ['Use for aaaa.']);
});

test('reads a SKILL.md again once its time changed', () => {
  const file = writeSkill(path.join(dir, 'changed', 'notes'), 'notes', 'Use for aaaa.');
  const { mtime } = fs.statSync(file);
  const cache = new Map();
  buildIndex([{ folder: path.join(dir, 'changed'), source: 'test' }], { cache });
  rewriteKeepingTime(file, fs.readFileSync(file, 'utf8').replace('aaaa', 'bbbb'), new Date(mtime.getTime() + 2000));
  const index = buildIndex([{ folder: path.join(dir, 'changed'), source: 'test' }], { cache });
  assert.deepStrictEqual(index.skills.map((s) => s.description), ['Use for bbbb.']);
});

test('reads a SKILL.md again once its size changed at the same time', () => {
  const file = writeSkill(path.join(dir, 'resized', 'notes'), 'notes', 'Use for aaaa.');
  const mtime = new Date(2026, 0, 1);
  fs.utimesSync(file, mtime, mtime);
  const cache = new Map();
  buildIndex([{ folder: path.join(dir, 'resized'), source: 'test' }], { cache });
  rewriteKeepingTime(file, fs.readFileSync(file, 'utf8').replace('aaaa', 'aaaa bbbb'), mtime);
  const index = buildIndex([{ folder: path.join(dir, 'resized'), source: 'test' }], { cache });
  assert.deepStrictEqual(index.skills.map((s) => s.description), ['Use for aaaa bbbb.']);
});

test('gives a cached skill the source of the folder it is found under now', () => {
  writeSkill(path.join(dir, 'moved-source', 'notes'), 'notes');
  const cache = new Map();
  buildIndex([{ folder: path.join(dir, 'moved-source'), source: 'first' }], { cache });
  const index = buildIndex([{ folder: path.join(dir, 'moved-source'), source: 'second' }], { cache });
  assert.deepStrictEqual(index.skills.map((s) => s.source), ['second']);
});

test('leaves out a SKILL.md larger than 1 MiB and keeps one of exactly 1 MiB', () => {
  const root = path.join(dir, 'size-limit');
  const write = (name, size) => {
    const head = `---\nname: ${name}\ndescription: Use for ${name}.\n---\n`;
    fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(path.join(root, name, 'SKILL.md'), head + 'x'.repeat(size - head.length));
  };
  write('fits', 1024 * 1024);
  write('over', 1024 * 1024 + 1);
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => s.name), ['fits']);
});

test('leaves out a SKILL.md that grew beyond 1 MiB after its size was read', (t) => {
  const root = path.join(dir, 'grown');
  const file = writeSkill(path.join(root, 'grown'), 'grown');
  const statSync = fs.statSync;
  t.mock.method(fs, 'statSync', (target, ...rest) => {
    const stat = statSync(target, ...rest);
    if (path.basename(String(target)) === 'SKILL.md') fs.appendFileSync(file, 'x'.repeat(1024 * 1024));
    return stat;
  });
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills, []);
});

test('reads the whole of a SKILL.md that grew within 1 MiB after its size was read', (t) => {
  const root = path.join(dir, 'grown-within');
  const file = writeSkill(path.join(root, 'grown'), 'grown');
  const added = 'Added text. '.repeat(1000);
  const statSync = fs.statSync;
  t.mock.method(fs, 'statSync', (target, ...rest) => {
    const stat = statSync(target, ...rest);
    if (path.basename(String(target)) === 'SKILL.md') fs.appendFileSync(file, added);
    return stat;
  });
  const [skill] = buildIndex([{ folder: root, source: 'test' }]).skills;
  assert.ok(skill.body.endsWith(added));
});

test('drops a skill whose SKILL.md was removed since the previous index', () => {
  const file = writeSkill(path.join(dir, 'removed', 'notes'), 'notes');
  const cache = new Map();
  buildIndex([{ folder: path.join(dir, 'removed'), source: 'test' }], { cache });
  fs.rmSync(file);
  const index = buildIndex([{ folder: path.join(dir, 'removed'), source: 'test' }], { cache });
  assert.deepStrictEqual([index.skills, [...cache.keys()]], [[], []]);
});

test('keeps two skills of the same name, each under its path', () => {
  const one = writeSkill(path.join(dir, 'same', 'a', 'planning'), 'planning');
  const two = writeSkill(path.join(dir, 'same', 'b', 'planning'), 'planning');
  const index = buildIndex([
    { folder: path.join(dir, 'same', 'a'), source: 'first' },
    { folder: path.join(dir, 'same', 'b'), source: 'second' },
  ]);
  assert.deepStrictEqual(
    index.skills.map((s) => [s.name, s.path, s.source]),
    [['planning', one, 'first'], ['planning', two, 'second']],
  );
});

test('leaves out a skill of a folder another source hides by a skill of the same name, as Claude Code hides a project skill', () => {
  const user = writeSkill(path.join(dir, 'hidden', 'user', 'review'), 'review');
  writeSkill(path.join(dir, 'hidden', 'project', 'review'), 'review');
  const own = writeSkill(path.join(dir, 'hidden', 'project', 'deploy'), 'deploy');
  const codex = writeSkill(path.join(dir, 'hidden', 'codex', 'review'), 'review');
  const index = buildIndex([
    { folder: path.join(dir, 'hidden', 'user'), source: 'claude-user' },
    { folder: path.join(dir, 'hidden', 'project'), source: 'claude-project', hiddenBy: 'claude-user' },
    { folder: path.join(dir, 'hidden', 'codex'), source: 'codex-project' },
  ]);
  assert.deepStrictEqual(index.skills.map((s) => s.path).sort(), [user, own, codex].sort());
});

test('lists a skill once when two configured folders overlap', () => {
  const file = writeSkill(path.join(dir, 'overlap', 'inner', 'only'), 'only');
  const index = buildIndex([
    { folder: path.join(dir, 'overlap'), source: 'outer' },
    { folder: path.join(dir, 'overlap', 'inner'), source: 'inner' },
  ]);
  assert.deepStrictEqual(index.skills.map((s) => [s.path, s.source]), [[file, 'outer']]);
});

test('follows a linked folder and stops where a link leads back into a visited one', () => {
  const root = path.join(dir, 'links');
  const own = writeSkill(path.join(root, 'own'), 'own');
  const linked = writeSkill(path.join(dir, 'elsewhere', 'linked'), 'linked');
  fs.symlinkSync(path.join(dir, 'elsewhere'), path.join(root, 'to-elsewhere'), 'junction');
  fs.symlinkSync(root, path.join(root, 'own', 'back-to-root'), 'junction');
  const index = buildIndex([{ folder: root, source: 'test' }]);
  assert.deepStrictEqual(index.skills.map((s) => s.path).sort(), [linked, own].sort());
});

test('takes the folder name and an empty description when the frontmatter gives no text for them', () => {
  const root = path.join(dir, 'odd-values');
  fs.mkdirSync(path.join(root, 'listed'), { recursive: true });
  fs.writeFileSync(path.join(root, 'listed', 'SKILL.md'), '---\nname: [a, b]\ndescription:\n  key: value\n---\n');
  const [skill] = buildIndex([{ folder: root, source: 'test' }]).skills;
  assert.deepStrictEqual([skill.name, skill.description], ['listed', '']);
});

test('describes a skill without a description by the first line of its instructions, heading marks dropped, as Claude Code lists it', () => {
  const root = path.join(dir, 'no-description');
  fs.mkdirSync(path.join(root, 'nodesc'), { recursive: true });
  fs.writeFileSync(path.join(root, 'nodesc', 'SKILL.md'), '---\nname: nodesc\n---\n\nRuns the probe.\nSecond line.\n');
  fs.mkdirSync(path.join(root, 'bare'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bare', 'SKILL.md'), '# Bare probe\n\nRuns the bare probe.\n');
  const described = buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => [s.name, s.description]).sort();
  assert.deepStrictEqual(described, [['bare', 'Bare probe'], ['nodesc', 'Runs the probe.']]);
});

test('indexes the other skills when one SKILL.md entry is a broken link', () => {
  const root = path.join(dir, 'broken');
  const good = writeSkill(path.join(root, 'good'), 'good');
  fs.mkdirSync(path.join(root, 'bad'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'gone'));
  fs.symlinkSync(path.join(dir, 'gone'), path.join(root, 'bad', 'SKILL.md'), 'junction');
  fs.rmdirSync(path.join(dir, 'gone'));
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => s.path), [good]);
});

test('indexes each SKILL.md link to one file as a skill of the folder holding the link', (t) => {
  const root = path.join(dir, 'file-links');
  const shared = path.join(dir, 'store', 'shared.md');
  fs.mkdirSync(path.dirname(shared), { recursive: true });
  fs.writeFileSync(shared, '---\ndescription: Shared instructions.\n---\n\nBody.\n');
  try {
    for (const name of ['foo', 'bar']) {
      fs.mkdirSync(path.join(root, name), { recursive: true });
      fs.symlinkSync(shared, path.join(root, name, 'SKILL.md'), 'file');
    }
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('this account may not create file links');
    throw error;
  }
  const real = fs.realpathSync.native(root);
  const skills = buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => [s.name, s.path, s.folder]);
  assert.deepStrictEqual(skills.sort(), ['bar', 'foo'].map((name) => [name, path.join(real, name, 'SKILL.md'), path.join(real, name)]));
});

test('stops walking after the stated number of folder entries', () => {
  const root = path.join(dir, 'wide');
  for (let n = 0; n < 30; n++) writeSkill(path.join(root, `s${String(n).padStart(2, '0')}`), `s${n}`);
  const { skills } = buildIndex([{ folder: root, source: 'test' }], { maxEntries: 10 });
  assert.ok(skills.length > 0 && skills.length < 30, `indexed ${skills.length}`);
});

test('gives each configured folder its own budget of entries', () => {
  const big = path.join(dir, 'budget', 'big');
  for (let n = 0; n < 20; n++) writeSkill(path.join(big, `b${String(n).padStart(2, '0')}`), `b${n}`);
  const small = writeSkill(path.join(dir, 'budget', 'small', 'only'), 'only');
  const { skills } = buildIndex([{ folder: big, source: 'big' }, { folder: path.join(dir, 'budget', 'small'), source: 'small' }], { maxEntries: 10 });
  assert.ok(skills.some((s) => s.path === small));
});

test('leaves a folder a link leads back into before spending the budget on it', () => {
  const root = path.join(dir, 'loop-budget');
  fs.mkdirSync(root, { recursive: true });
  fs.symlinkSync(root, path.join(root, 'a-loop'), 'junction');
  const last = writeSkill(path.join(root, 'z-skill'), 'z-skill');
  const { skills } = buildIndex([{ folder: root, source: 'test' }], { maxEntries: 6 });
  assert.deepStrictEqual(skills.map((s) => s.path), [last]);
});

test('leaves out the .git folder of a skill repository', () => {
  const root = path.join(dir, 'with-git');
  const kept = writeSkill(path.join(root, 'kept'), 'kept');
  writeSkill(path.join(root, '.git', 'stray'), 'stray');
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => s.path), [kept]);
});

test('leaves out every folder whose name starts with a dot and every node_modules folder', () => {
  const root = path.join(dir, 'service');
  const kept = writeSkill(path.join(root, 'kept'), 'kept');
  writeSkill(path.join(root, '.trash', '1791476929054', 'removed'), 'removed');
  writeSkill(path.join(root, '.hidden'), 'hidden');
  writeSkill(path.join(root, 'kept', 'scripts', 'node_modules', 'package'), 'package');
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => s.path), [kept]);
});

test('leaves out the folders a configured folder excludes, though another configured folder lies inside them', () => {
  const root = path.join(dir, 'excluding');
  const kept = writeSkill(path.join(root, 'kept'), 'kept');
  const synced = path.join(root, 'synced');
  writeSkill(path.join(synced, 'other-account', 'docx'), 'docx');
  const current = writeSkill(path.join(synced, 'this-account', 'pdf'), 'pdf');
  const roots = [{ folder: root, source: 'user', excluded: [synced] }, { folder: path.join(synced, 'this-account'), source: 'synced' }];
  assert.deepStrictEqual(buildIndex(roots).skills.map((s) => s.path), [kept, current]);
});

test('follows a link another configured folder holds into the folder one configured folder excludes', () => {
  const user = path.join(dir, 'linked-excluded', 'user');
  const synced = path.join(user, 'synced');
  const docx = writeSkill(path.join(synced, 'other-account', 'docx'), 'docx');
  const project = path.join(dir, 'linked-excluded', 'project');
  fs.mkdirSync(project, { recursive: true });
  fs.symlinkSync(path.join(synced, 'other-account'), path.join(project, 'shared'), 'junction');
  const roots = [{ folder: user, source: 'user', excluded: [synced] }, { folder: project, source: 'project' }];
  assert.deepStrictEqual(buildIndex(roots).skills.map((s) => [s.path, s.source]), [[docx, 'project']]);
});

test('skips a configured folder that does not exist', () => {
  const index = buildIndex([{ folder: path.join(dir, 'missing'), source: 'test' }]);
  assert.deepStrictEqual(index.skills, []);
});
