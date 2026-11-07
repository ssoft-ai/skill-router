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
  return JSON.parse(result.content[0].text).map((found) => found.name);
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

test('finds a nested skill and loads it by the path the search returned', () => {
  const [found] = JSON.parse(call('search_skills', { query: 'commit message' }).content[0].text);
  const loaded = call('load_skill', { path: found.skills[0].path });
  assert.strictEqual(found.name, 'commit-rules');
  assert.match(loaded.content[0].text, new RegExp(`^Skill folder: .*commit-rules\\n\\n---\\nname: commit-rules`));
});

test('accepts the limits 1 and 20', () => {
  for (const limit of [1, 20]) assert.notStrictEqual(call('search_skills', { query: 'commit', limit }).isError, true, String(limit));
});

test('refuses a search without words and a limit outside 1 to 20', () => {
  const refused = [{ query: '' }, { query: 'commit', limit: 0 }, { query: 'commit', limit: 21 }, { query: 'commit', limit: 2.5 }];
  for (const args of refused) assert.strictEqual(call('search_skills', args).isError, true, JSON.stringify(args));
});
