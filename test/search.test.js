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

test('ranks a skill writing a query word in its description above one writing it only in its instructions', () => {
  const described = skill('tagging', 'Apply when a version tag is created');
  const mentioned = skill('notes', 'Apply when notes are written', {}, 'Name the version tag in the title.');
  const results = search([mentioned, described], 'version tag');
  assert.deepStrictEqual(results.map((r) => r.name), ['tagging', 'notes']);
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
