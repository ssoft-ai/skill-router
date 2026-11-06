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
