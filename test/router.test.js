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

const instructionsOf = (folders, env = {}) => createRouter({ folders, env, home: path.join(dir, 'elsewhere'), cwd: dir })
  .handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }).result.instructions;
const treeOf = (instructions) => instructions.split('\n\n').at(-1).split('\n');

test('lists in its instructions every skill stored inside another skill\'s folder, at any depth, and names none under a search result', () => {
  const folder = path.join(dir, 'found-tree');
  writeSkill(folder, 'mobile', 'Apply when phone apps are built');
  writeSkill(path.join(folder, 'mobile'), 'kite-switches', 'Apply when Kite flips');
  writeSkill(path.join(folder, 'mobile', 'kite-switches'), 'kite-audit', 'Apply when Kite history is read');
  writeSkill(path.join(folder, 'mobile', 'builds'), 'ios-signing', 'Apply when profiles fail');
  writeSkill(folder, 'flat', 'Apply when phone numbers are formatted');
  const real = fs.realpathSync.native(folder);
  const tree = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const searched = tree.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'phone apps built' } } }).result.content[0].text;
  assert.deepStrictEqual([treeOf(instructionsOf([folder])), searched.includes('narrower')],
    [[real, '  mobile', `    ${path.join('builds', 'ios-signing')}`, '    kite-switches', '      kite-audit'], false]);
});

test('lists a skill linked into another skill\'s folder by the name of the link, in the tree and in a load of the skill above, and loads it by that path', () => {
  const folder = path.join(dir, 'linked-tree');
  writeSkill(path.join(folder, 'skills'), 'mobile', 'Apply when phone apps are built');
  writeSkill(path.join(folder, 'store'), 'kite-store', 'Apply when Kite flips');
  fs.symlinkSync(path.join(folder, 'store', 'kite-store'), path.join(folder, 'skills', 'mobile', 'kite'), 'junction');
  const real = fs.realpathSync.native(path.join(folder, 'skills'));
  const tree = createRouter({ folders: [path.join(folder, 'skills')], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const load = (target) => tree.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'load_skill', arguments: { path: target } } }).result;
  const listed = load(path.join(real, 'mobile')).content[0].text.split('\n').map((line) => line.trim());
  assert.deepStrictEqual([treeOf(instructionsOf([path.join(folder, 'skills')])), listed.includes(path.join(real, 'mobile', 'kite')), load(path.join(real, 'mobile', 'kite')).isError ?? false],
    [[real, '  mobile', '    kite (skill kite-store)'], true, false]);
});

test('lists apart two copies of a skill whose folders hold different skills', () => {
  const folder = path.join(dir, 'copies-tree');
  writeSkill(path.join(folder, 'a'), 'mobile', 'Apply when phone apps are built');
  writeSkill(path.join(folder, 'a', 'mobile'), 'kite-switches', 'Apply when Kite flips');
  writeSkill(path.join(folder, 'b'), 'mobile', 'Apply when phone apps are built');
  writeSkill(path.join(folder, 'b', 'mobile'), 'ios-signing', 'Apply when profiles fail');
  const real = fs.realpathSync.native(folder);
  assert.deepStrictEqual(treeOf(instructionsOf([folder])),
    [real, `  ${path.join('a', 'mobile')}`, '    kite-switches', `  ${path.join('b', 'mobile')}`, '    ios-signing']);
});

test('gives in its instructions the path of the first skill of its tree as an example, which load_skill loads', () => {
  const folder = path.join(dir, 'example-tree');
  writeSkill(folder, 'documents', 'Apply when papers are written');
  writeSkill(path.join(folder, 'documents'), 'lumen-brief', 'Apply when Lumen is due', undefined, 'Fill the brief.\n');
  const real = fs.realpathSync.native(folder);
  const example = path.join(real, 'documents', 'lumen-brief');
  const instructions = instructionsOf([folder]);
  const tree = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const loaded = tree.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'load_skill', arguments: { path: example } } }).result.content[0].text;
  assert.deepStrictEqual([instructions.includes(example), loaded.includes('Fill the brief.')], [true, true]);
});

test('keeps its instructions free of a tree where no skill is stored inside another', () => {
  const folder = path.join(dir, 'flat-tree');
  writeSkill(folder, 'notes', 'Apply when notes are written');
  assert.deepStrictEqual(instructionsOf([folder]).split('\n\n').length, 1);
});

test('shortens the tree from its deepest level to stay within the characters its setting names, naming how many skills each cut line holds, and keeps it whole with no setting', () => {
  const folder = path.join(dir, 'large-tree');
  writeSkill(folder, 'field', 'Apply when the field is worked');
  for (let n = 0; n < 36; n++) {
    const area = `area-with-a-long-folder-name-${String(n).padStart(2, '0')}`;
    writeSkill(path.join(folder, 'field'), area, 'Apply when the area is worked');
    for (let k = 1; k <= 3; k++) writeSkill(path.join(folder, 'field', area), `leaf-skill-with-a-long-folder-name-${k}`, 'Apply when a leaf is worked');
  }
  const instructions = instructionsOf([folder], { SKILL_ROUTER_INSTRUCTIONS_LIMIT: '4096' });
  const lines = treeOf(instructions);
  const whole = treeOf(instructionsOf([folder]));
  assert.deepStrictEqual([instructions.length <= 4096, lines[1], lines[2], whole.includes('      leaf-skill-with-a-long-folder-name-3')],
    [true, '  field', '    area-with-a-long-folder-name-00 (3 more skills inside; load it to list them)', true]);
});

test('builds the tree once for each skill however many links lead to it, within a second for twenty layers of shared links', () => {
  const folder = path.join(dir, 'shared-links');
  for (let layer = 0; layer < 20; layer++) for (const side of ['a', 'b']) writeSkill(folder, `l${layer}${side}`, 'Apply when a layer is worked');
  for (let layer = 0; layer < 19; layer++) {
    for (const side of ['a', 'b']) {
      for (const next of ['a', 'b']) fs.symlinkSync(path.join(folder, `l${layer + 1}${next}`), path.join(folder, `l${layer}${side}`, `to-${next}`), 'junction');
    }
  }
  const started = process.hrtime.bigint();
  const instructions = instructionsOf([folder]);
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  assert.deepStrictEqual([elapsed < 1000, instructions.length <= 4096], [true, true], `${elapsed} ms`);
});

const { instructionsText } = require('../src/texts');
const node = (name, children = []) => ({ skill: { name }, rel: name, children });

test('names on a cut line as many skills as a load of that skill lists, its nearest level', () => {
  const tops = Array.from({ length: 40 }, (_, n) => node(`child-skill-with-a-long-folder-name-${String(n).padStart(2, '0')}`,
    [node('grandchild-skill-with-a-long-name', [node('great-grandchild-skill-one-long'), node('great-grandchild-skill-two-long')])]));
  const text = instructionsText('Base.', [{ root: '/r', nodes: [node('top', tops)] }], (p) => p, 4096);
  const cut = text.split('\n').filter((line) => line.includes('more skill'));
  assert.deepStrictEqual([cut.length > 0, cut.every((line) => line.includes('(1 more skill inside;'))], [true, true]);
});

test('ends a cut tree with a skill line, never with a root that lists nothing', () => {
  const ends = [];
  for (let count = 60; count < 140; count++) {
    const first = Array.from({ length: count }, (_, n) => node(`first-root-skill-${String(n).padStart(3, '0')}`, [node('inner')]));
    const text = instructionsText('Base.', [{ root: '/first', nodes: first }, { root: '/second', nodes: [node('second-root-skill', [node('inner')])] }], (p) => p, 4096);
    const lines = text.split('\n');
    ends.push(lines.at(-2));
  }
  assert.deepStrictEqual(ends.filter((line) => line === '/first' || line === '/second'), []);
});

test('lists a skill at its own folder inside the root, though links in other skills\' folders lead to it', () => {
  const folder = path.join(dir, 'twice-linked');
  writeSkill(folder, 'a', 'Apply when a is worked');
  writeSkill(folder, 'b', 'Apply when b is worked');
  writeSkill(path.join(folder, 'store'), 'shared', 'Apply when shared is worked');
  writeSkill(path.join(folder, 'store', 'shared'), 'inner', 'Apply when inner is worked');
  fs.symlinkSync(path.join(folder, 'store', 'shared'), path.join(folder, 'a', 'x'), 'junction');
  fs.symlinkSync(path.join(folder, 'store', 'shared'), path.join(folder, 'b', 'y'), 'junction');
  const real = fs.realpathSync.native(folder);
  assert.deepStrictEqual(treeOf(instructionsOf([folder])),
    [real, `  ${path.join('store', 'shared')}`, '    inner']);
});

test('names on the line of a root folder that is itself a skill that skill, the skills inside it below', () => {
  const folder = path.join(dir, 'root-skill');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'SKILL.md'), '---\nname: rootskill\ndescription: Apply when the root is worked\n---\n');
  writeSkill(folder, 'inner', 'Apply when inner is worked');
  const real = fs.realpathSync.native(folder);
  assert.deepStrictEqual(treeOf(instructionsOf([folder])), [`${real} (skill rootskill)`, '  inner']);
});

test('cuts a root folder that is itself a skill at the same level as the skills a plain root holds', () => {
  const domains = Array.from({ length: 60 }, (_, n) => node(`domain-${String(n).padStart(2, '0')}`,
    [node('first-nested-skill'), node('second-nested-skill'), node('third-nested-skill')]));
  const rootSkill = { skill: { name: 'rootskill' }, rel: '', children: [node('x', [node('y')])] };
  const lines = instructionsText('Base.', [{ root: '/a', nodes: [rootSkill] }, { root: '/b', nodes: domains }], (p) => p, 4096).split('\n');
  assert.deepStrictEqual([lines.includes('/a (skill rootskill) (1 more skill inside; load it to list them)'), lines.includes('  x')], [true, false]);
});

test('keeps the line of a root folder that is itself a skill where the cut tree ends after it', () => {
  const ends = [];
  for (let count = 1; count < 60; count++) {
    const first = Array.from({ length: count }, (_, n) => node(`first-root-skill-${String(n).padStart(3, '0')}`, [node('inner')]));
    const second = { skill: { name: 'rootskill' }, rel: '', children: [node('inner')] };
    const third = Array.from({ length: 40 }, (_, n) => node(`third-root-skill-with-a-very-long-folder-name-${String(n).padStart(3, '0')}`,
      [node('inner-skill-with-a-long-folder-name')]));
    const roots = [{ root: '/first', nodes: first }, { root: '/second', nodes: [second] }, { root: '/third', nodes: third }];
    const lines = instructionsText('Base.', roots, (p) => p, 4096).split('\n');
    if (lines.at(-1).startsWith('Further folders are not shown')) ends.push(lines.at(-2));
  }
  assert.deepStrictEqual([ends.some((line) => line.startsWith('/second (skill rootskill)')), ends.some((line) => ['/first', '/second', '/third'].includes(line))], [true, false]);
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

test('lists after the instructions of a loaded skill the skills one level inside its folder, each with its folder and description', () => {
  const folder = path.join(dir, 'tree');
  writeSkill(folder, 'security', 'Apply when systems are protected', undefined, 'Protect the system.\n');
  writeSkill(path.join(folder, 'security', 'checks'), 'secret-scanning', 'Apply when keys leak');
  writeSkill(path.join(folder, 'security'), 'threat-modelling', 'Apply when attacks are mapped');
  writeSkill(path.join(folder, 'security', 'threat-modelling'), 'stride', 'Apply when STRIDE is walked');
  const tree = createRouter({ folders: [folder], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const real = fs.realpathSync.native(folder);
  const loaded = tree.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'load_skill', arguments: { path: path.join(folder, 'security') } } }).result;
  const [, inside] = loaded.content[0].text.split('Protect the system.\n');
  const listed = inside.split('\n').filter((line) => line && !line.startsWith(' ') && !line.endsWith(':'));
  assert.deepStrictEqual([listed.sort(), inside.includes(path.join(real, 'security', 'checks', 'secret-scanning')), inside.includes('Apply when attacks are mapped')],
    [['secret-scanning', 'threat-modelling'], true, true]);
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
  assert.strictEqual(call('search_skills', { query: 'zzzz qqqq' }).content[0].text, 'No skill shares a word with the query.');
});

test('accepts the limits 1 and 20', () => {
  for (const limit of [1, 20]) assert.notStrictEqual(call('search_skills', { query: 'commit', limit }).isError, true, String(limit));
});

test('refuses a search without words and a limit outside 1 to 20', () => {
  const refused = [{ query: '' }, { query: 'commit', limit: 0 }, { query: 'commit', limit: 21 }, { query: 'commit', limit: 2.5 }];
  for (const args of refused) assert.strictEqual(call('search_skills', args).isError, true, JSON.stringify(args));
});
