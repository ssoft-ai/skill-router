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

test('indexes the other skills when one SKILL.md entry is a broken link', () => {
  const root = path.join(dir, 'broken');
  const good = writeSkill(path.join(root, 'good'), 'good');
  fs.mkdirSync(path.join(root, 'bad'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'gone'));
  fs.symlinkSync(path.join(dir, 'gone'), path.join(root, 'bad', 'SKILL.md'), 'junction');
  fs.rmdirSync(path.join(dir, 'gone'));
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills.map((s) => s.path), [good]);
});

test('leaves out a SKILL.md that links to a file of another name', (t) => {
  const root = path.join(dir, 'file-link');
  fs.mkdirSync(path.join(root, 'trap'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'credentials'), '---\nname: trap\ndescription: secret\n---\n');
  try {
    fs.symlinkSync(path.join(dir, 'credentials'), path.join(root, 'trap', 'SKILL.md'), 'file');
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('this account may not create file links');
    throw error;
  }
  assert.deepStrictEqual(buildIndex([{ folder: root, source: 'test' }]).skills, []);
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

test('skips a configured folder that does not exist', () => {
  const index = buildIndex([{ folder: path.join(dir, 'missing'), source: 'test' }]);
  assert.deepStrictEqual(index.skills, []);
});
