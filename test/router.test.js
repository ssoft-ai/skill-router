'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRouter } = require('../src/router');

let dir;
let router;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-router-'));
  const folder = path.join(dir, 'skills', 'nested', 'commit-rules');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'SKILL.md'), '---\nname: commit-rules\ndescription: Apply when writing commit messages\n---\nUse the imperative.\n');
  router = createRouter({ folders: [path.join(dir, 'skills')], env: {}, home: dir, cwd: dir });
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const call = (name, args) => router.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }).result;

test('offers a search tool and a load tool', () => {
  const { tools } = router.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).result;
  assert.deepStrictEqual(tools.map((t) => t.name), ['search_skills', 'load_skill']);
});

test('asks for the language and the kind of file the task works on in the query', () => {
  const { tools } = router.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).result;
  assert.match(tools[0].inputSchema.properties.query.description, /language and the kind of file/);
});

const writeSkill = (folder, name, description, paths, instructions = '') => {
  fs.mkdirSync(path.join(folder, name), { recursive: true });
  const metadata = paths ? `metadata:\n  paths: "${paths}"\n` : '';
  fs.writeFileSync(path.join(folder, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n${metadata}---\n${instructions}`);
};

const searchNames = (folder, project) => {
  const projectRouter = createRouter({ folders: [folder], env: { CLAUDE_PROJECT_DIR: project }, home: dir, cwd: project });
  const result = projectRouter.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'writing code' } } }).result;
  return result.content[0].text.split('\n').filter((line) => !line.startsWith(' '));
};

test('ranks a skill whose metadata paths match a project file where it ranks without them', () => {
  const project = path.join(dir, 'paths-project');
  fs.mkdirSync(path.join(project, 'src'), { recursive: true });
  fs.writeFileSync(path.join(project, 'src', 'main.cpp'), '');
  const withPaths = path.join(dir, 'paths-skills');
  const withoutPaths = path.join(dir, 'plain-skills');
  writeSkill(withPaths, 'python-style', 'Apply when writing code', undefined, 'Keep the code readable.\n');
  writeSkill(withPaths, 'style-cpp', 'Apply when writing code for a native build', '**/*.cpp');
  writeSkill(withoutPaths, 'python-style', 'Apply when writing code', undefined, 'Keep the code readable.\n');
  writeSkill(withoutPaths, 'style-cpp', 'Apply when writing code for a native build');
  const ranked = ['python-style', 'style-cpp'];
  assert.deepStrictEqual([searchNames(withPaths, project), searchNames(withoutPaths, project)], [ranked, ranked]);
});

test('lists no file of the project when it searches', (t) => {
  const project = path.join(dir, 'listed-project');
  fs.mkdirSync(path.join(project, 'src'), { recursive: true });
  fs.writeFileSync(path.join(project, 'src', 'main.cpp'), '');
  const skills = path.join(dir, 'listed-skills');
  writeSkill(skills, 'cpp-style', 'Apply when writing code', '**/*.cpp');
  const read = [];
  const readdirSync = fs.readdirSync;
  t.mock.method(fs, 'readdirSync', (folder, ...rest) => {
    read.push(path.resolve(String(folder)));
    return readdirSync(folder, ...rest);
  });
  searchNames(skills, project);
  const projectRoot = fs.realpathSync.native(project);
  assert.deepStrictEqual(read.filter((folder) => [path.resolve(project), projectRoot].some((root) => folder === root || folder.startsWith(`${root}${path.sep}`))), []);
});

test('finds a nested skill and loads its instructions by the folder the search returned', () => {
  const [name, folder, description] = call('search_skills', { query: 'commit message' }).content[0].text.split('\n');
  const loaded = call('load_skill', { path: folder.trim() });
  assert.deepStrictEqual([name, description, loaded.content[0].text],
    ['commit-rules', '  Apply when writing commit messages', `Skill folder: ${folder.trim()}\n\nUse the imperative.\n`]);
});

test('lists under one name the folders of its skills, each description once after the folders sharing it', () => {
  const folder = path.join(dir, 'copies');
  writeSkill(folder, 'notes', 'Apply when notes are written');
  writeSkill(path.join(folder, 'v1'), 'notes', 'Apply when notes are written');
  writeSkill(path.join(folder, 'other'), 'notes', 'Apply when notes of a meeting are written');
  const copies = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const result = copies.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'notes' } } }).result;
  const real = fs.realpathSync.native(folder);
  const [name, ...lines] = result.content[0].text.split('\n').map((line) => line.trim());
  const groups = [];
  let folders = [];
  for (const line of lines) {
    if (path.isAbsolute(line)) folders.push(line);
    else { groups.push([line, folders.sort()]); folders = []; }
  }
  assert.deepStrictEqual([name, groups.sort()], ['notes', [
    ['Apply when notes are written', [path.join(real, 'notes'), path.join(real, 'v1', 'notes')].sort()],
    ['Apply when notes of a meeting are written', [path.join(real, 'other', 'notes')]],
  ].sort()]);
});

test('shows a description written over several lines on one indented line', () => {
  const folder = path.join(dir, 'block-descriptions');
  for (const [name, marker] of [['literal-notes', '|'], ['folded-notes', '>']]) {
    fs.mkdirSync(path.join(folder, name), { recursive: true });
    fs.writeFileSync(path.join(folder, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${marker}\n  Apply when notes\n  are written\n---\n`);
  }
  const blocks = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const result = blocks.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'notes' } } }).result;
  const lines = result.content[0].text.split('\n');
  assert.deepStrictEqual([lines.filter((line) => !line.startsWith('  ')).sort(), lines.filter((line) => line.trim() === 'Apply when notes are written').length],
    [['folded-notes', 'literal-notes'], 2]);
});

test('names a skill whose frontmatter name is blank by its folder, as a skill without a name', () => {
  const folder = path.join(dir, 'blank-names');
  fs.mkdirSync(path.join(folder, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(folder, 'notes', 'SKILL.md'), '---\nname: "   "\ndescription: Apply when notes are written\n---\n');
  const blank = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const text = blank.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'notes' } } }).result.content[0].text;
  assert.strictEqual(text.split('\n')[0], 'notes');
});

test('returns as one result the skills whose names differ only in their line breaks and spaces', () => {
  const folder = path.join(dir, 'spaced-names');
  for (const [sub, name] of [['a', 'release notes'], ['b', '|\n  release\n  notes']]) {
    fs.mkdirSync(path.join(folder, sub), { recursive: true });
    fs.writeFileSync(path.join(folder, sub, 'SKILL.md'), `---\nname: ${name}\ndescription: Apply when release notes are written\n---\n`);
  }
  const spaced = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const text = spaced.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'release notes' } } }).result.content[0].text;
  assert.deepStrictEqual(text.split('\n').filter((line) => !line.startsWith(' ')), ['release notes']);
});

test('answers a search no skill fits in words', () => {
  assert.strictEqual(call('search_skills', { query: 'zzzz qqqq' }).content[0].text, 'No skill fits.');
});

test('accepts the limits 1 and 20', () => {
  for (const limit of [1, 20]) assert.notStrictEqual(call('search_skills', { query: 'commit', limit }).isError, true, String(limit));
});

test('refuses a search without words and a limit outside 1 to 20', () => {
  const refused = [{ query: '' }, { query: 'commit', limit: 0 }, { query: 'commit', limit: 21 }, { query: 'commit', limit: 2.5 }];
  for (const args of refused) assert.strictEqual(call('search_skills', args).isError, true, JSON.stringify(args));
});
