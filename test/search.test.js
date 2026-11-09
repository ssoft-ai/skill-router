'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { search } = require('../src/search');

const skill = (name, description, metadata = {}, body = '') => ({ name, description, metadata, body, path: `/skills/${name}/SKILL.md`, folder: `/skills/${name}` });

const skills = [
  skill('commit-rules', 'Apply when writing or reviewing commit messages or naming branches'),
  skill('changelog', 'Apply when editing CHANGELOG.md or asked about changelog format'),
  skill('debugging', 'Apply when investigating a bug, test failure, or unexpected behavior'),
  skill('release', 'Apply when preparing a release, bumping version, or tagging'),
];

test('ranks first the skill sharing the most telling words with the request', () => {
  const results = search(skills, 'write the commit message');
  assert.strictEqual(results[0].name, 'commit-rules');
});

test('finds a skill described in another language that spaces its words by a request in that language', () => {
  const described = [
    ['de', 'Erstellt den Versionsbericht für den Kunden', 'Versionsbericht für den Kunden'],
    ['es', 'Prepara el informe de la versión para el cliente', 'informe de la versión'],
    ['ru', 'Готовит отчёт о выпуске для заказчика', 'отчёт о выпуске'],
  ];
  const found = described.map(([lang, description, query]) => search([...skills, skill(lang, description)], query)[0]?.name);
  assert.deepStrictEqual(found, described.map(([lang]) => lang));
});

test('finds a skill by a word only its instructions write', () => {
  const bisect = skill('history-search', 'Apply when a defect has to be traced to a change', {}, 'Run git bisect between a good and a bad tag.');
  const results = search([...skills, bisect], 'bisect');
  assert.deepStrictEqual(results.map((r) => r.name), ['history-search']);
});

test('ranks a skill writing a query word in its description above one writing it in its instructions instead, whatever the lengths and repeats', () => {
  const words = (prefix, count) => Array.from({ length: count }, (_, n) => `${prefix}${n}`).join(' ');
  const others = Array.from({ length: 20 }, (_, n) => skill(`other${n}`, words('d', 8), {}, words('w', 400)));
  const orders = [];
  for (const descriptionLength of [3, 30, 100, 300]) {
    for (const instructionsLength of [3, 400]) {
      for (const repeats of [1, 50]) {
        const description = words('x', descriptionLength);
        const instructions = words('y', instructionsLength);
        const described = skill('alpha', `${description} bisect`, {}, instructions);
        const instructed = skill('gamma', description, {}, `${instructions} ${'bisect '.repeat(repeats)}`);
        orders.push(search([...others, instructed, described], 'bisect').map((r) => r.name).join());
      }
    }
  }
  assert.deepStrictEqual(orders, orders.map(() => 'alpha,gamma'));
});

test('weighs a word of the name alike whatever the length of the name', () => {
  const long = skill('deploy-the-service-with-a-rollback', 'Apply when a service changes');
  const short = skill('deploy', 'Apply when a service changes');
  assert.deepStrictEqual(search([long, short], 'deploy').map((r) => r.name), [long.name, short.name]);
});

test('ranks a skill repeating a query word in a field no higher than one writing it there once', () => {
  const fields = [
    (word, other) => skill(`${word} ${other}`, 'Apply when a service is run'),
    (word, other) => skill(other, `Apply when a ${word} is run`),
    (word, other) => skill(other, 'Apply when a service is run', {}, `Run the ${word}.`),
  ];
  const orders = fields.map((write) => {
    const once = { ...write('rollback', 'once'), path: '/once/SKILL.md' };
    const repeated = { ...write(Array(50).fill('rollback').join(' '), 'repeated'), path: '/repeated/SKILL.md' };
    return search([once, repeated], 'rollback').map((r) => r.path).join();
  });
  assert.deepStrictEqual(orders, fields.map(() => '/once/SKILL.md,/repeated/SKILL.md'));
});

test('ranks a skill whose paths match a project file above an otherwise equal one', () => {
  const python = skill('python-style', 'Apply when writing code', { paths: ['**/*.py'] });
  const cpp = skill('cpp-style', 'Apply when writing code', { paths: '**/*.h, **/*.cpp' });
  const results = search([python, cpp], 'writing code', { projectFiles: ['src/main.cpp'] });
  assert.deepStrictEqual(results.map((r) => r.name), ['cpp-style', 'python-style']);
});

test('lists the project files only when some skill has paths', () => {
  let listed = 0;
  const projectFiles = () => { listed++; return ['src/main.cpp']; };
  search(skills, 'commit', { projectFiles });
  const unlistedRuns = listed;
  search([...skills, skill('cpp', 'Apply when writing commit code', { paths: '**/*.cpp' })], 'commit', { projectFiles });
  assert.deepStrictEqual([unlistedRuns, listed], [0, 1]);
});

test('returns copies of one skill, same name and description, as one result listing the other paths', () => {
  const copy = { ...skills[0], path: '/other/commit-rules/SKILL.md', folder: '/other/commit-rules' };
  const results = search([...skills, copy], 'commit message', { limit: 2 });
  assert.deepStrictEqual(results[0], {
    name: 'commit-rules',
    path: skills[0].path,
    description: skills[0].description,
    otherPaths: ['/other/commit-rules/SKILL.md'],
  });
  assert.notStrictEqual(results[1]?.name, 'commit-rules');
});

test('matches a word of the request to another form of it in a description', () => {
  const results = search([skill('versions', 'Apply when tagging a release'), skill('notes', 'Apply when writing notes')], 'tag');
  assert.deepStrictEqual(results.map((r) => r.name), ['versions']);
});

test('returns at most ten skills when no number is stated', () => {
  const many = Array.from({ length: 12 }, (_, n) => skill(`s${n}`, `Apply when writing code ${n}`));
  assert.strictEqual(search(many, 'writing code').length, 10);
});

test('returns at most the stated number of skills, each with its name, path and description', () => {
  const results = search(skills, 'apply when', { limit: 2 });
  assert.strictEqual(results.length, 2);
  for (const r of results) assert.deepStrictEqual(Object.keys(r).sort(), ['description', 'name', 'path']);
});

test('weighs a word of a description by the names and descriptions holding it, however many instructions hold it', () => {
  const others = Array.from({ length: 6 }, (_, n) => skill(`other${n}`, 'Apply when a service is run', {}, 'Cut a release of the service.'));
  const announcing = skill('announcing', 'Apply when a release is announced');
  const drafting = skill('drafting', 'Apply when text is written');
  const coding = skill('coding', 'Apply when code is written');
  assert.strictEqual(search([...others, drafting, coding, announcing], 'release written')[0].name, 'announcing');
});

test('ranks a skill writing a query word in a short description above one writing it in a long description', () => {
  const others = Array.from({ length: 10 }, (_, n) => skill(`other${n}`, `Apply when service ${n} is run`));
  const long = skill('long', `${'filler '.repeat(40)}rollback`);
  const short = skill('short', 'Apply when a rollback is run');
  assert.deepStrictEqual(search([...others, long, short], 'rollback').map((r) => r.name), ['short', 'long']);
});

test('weighs a word of the name at least twice one of the description, however short the description', () => {
  const others = Array.from({ length: 10 }, (_, n) => skill(`other${n}`, `${'filler '.repeat(30)}${n}`));
  const named = skill('rollback-guide', `${'filler '.repeat(30)}guide`);
  const described = skill('guide', 'rollback');
  assert.deepStrictEqual(search([...others, described, named], 'rollback').map((r) => r.name), ['rollback-guide', 'guide']);
});

test('leaves the articles, conjunctions and prepositions of a query out of the search', () => {
  const backup = skill('backup', 'Apply when files are copied to an archive');
  const lights = skill('lights', 'Turn on the lights and off the heating');
  assert.deepStrictEqual(search([backup, lights], 'backup and restore of the files on a disk').map((r) => r.name), ['backup']);
});

test('ranks the skills writing a query word in their descriptions above one writing it in its instructions, however many they are', () => {
  const described = Array.from({ length: 6 }, (_, n) => skill(`described${n}`, `Apply when canary ${n} is run`, {}, 'Run the service.'));
  const instructed = skill('instructed', 'Apply when a service is run', {}, 'Run the canary.');
  assert.strictEqual(search([instructed, ...described], 'canary').map((r) => r.name).indexOf('instructed'), described.length);
});

test('weighs a word of a long description at least half one of a short description', () => {
  const others = Array.from({ length: 10 }, (_, n) => skill(`other${n}`, `Apply when service ${n} is run`));
  const long = skill('long', `${'filler '.repeat(300)}rollback canary`);
  const short = skill('short', 'Apply when a rollback is run');
  assert.deepStrictEqual(search([...others, short, long], 'rollback canary').map((r) => r.name), ['long', 'short']);
});
