'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { ABBREVIATIONS } = require('../src/abbreviations');
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
    return search([once, repeated], 'rollback').map((r) => r.skills[0].path).join();
  });
  assert.deepStrictEqual(orders, fields.map(() => '/once/SKILL.md,/repeated/SKILL.md'));
});

const team = [
  ...skills,
  skill('review-rules', 'Apply when opening or reviewing a PR or an MR'),
  skill('style', 'Apply when writing issue, PR or commit text'),
  skill('forge', 'Apply when a merge request or a pull request is opened on the forge'),
  skill('pipelines', 'Apply when the continuous integration pipeline fails', {}, 'Rerun the job; read the API logs.'),
  skill('editor', 'Apply when the integrated development environment is set up'),
  skill('translations', 'Apply when the l10n strings are updated'),
];
const namesFor = (query, options) => search(team, query, options).map((r) => r.name);

test('finds a skill writing an abbreviation by its full form, and one writing the full form by the abbreviation', () => {
  assert.deepStrictEqual(namesFor('pull request').slice(0, 3).sort(), ['forge', 'review-rules', 'style']);
  assert.deepStrictEqual(namesFor('MR').sort(), ['forge', 'review-rules']);
});

test('ranks for a query writing a full form as for the same query writing its abbreviation', () => {
  assert.deepStrictEqual(namesFor('write the pull request description'), namesFor('write the PR description'));
  assert.deepStrictEqual(namesFor('pull requests to review'), namesFor('PRs to review'));
  assert.deepStrictEqual(namesFor('fix the continuous integration job'), namesFor('fix the CI job'));
});

test('ranks for a query writing an abbreviation as for the same query writing its full form', () => {
  assert.deepStrictEqual(namesFor('open the MR'), namesFor('open the merge request'));
  assert.deepStrictEqual(namesFor('application programming interface logs'), namesFor('API logs'));
});

test('ranks a query of words outside the abbreviations as it would with no abbreviations known', () => {
  const queries = ['commit message', 'opening the forge', 'job fails', 'writing text', 'integration', 'continuous pipeline',
    'request', 'user id', 'run it locally'];
  for (const query of queries) {
    assert.deepStrictEqual(namesFor(query), namesFor(query, { abbreviations: [] }), query);
  }
  const equalLength = [
    skill('items', 'Apply when the forge opens item one two three'),
    skill('requests', 'Apply when the forge opens pull request merge request'),
  ];
  for (const order of [equalLength, [...equalLength].reverse()]) {
    const names = (options) => search(order, 'forge', options).map((r) => r.name);
    assert.deepStrictEqual(names(), names({ abbreviations: [] }));
  }
});

const writing = (word) => skill(`writes-${word}`, `Apply when the ${word} is set up`);
const tableSkills = ABBREVIATIONS.flatMap(({ short, full }) => [writing(short[0]), writing(full[0])]);

test('ranks a word the abbreviations do not list as with no abbreviations known, though it is an abbreviation with an s', () => {
  const listed = new Set(ABBREVIATIONS.flatMap(({ short }) => short));
  const words = [...listed].flatMap((form) => [`${form}s`, `${form}es`]).filter((word) => !listed.has(word));
  const corpus = [...tableSkills, ...words.map(writing)];
  const names = (query, options) => search(corpus, query, options).map((r) => r.name);
  assert.deepStrictEqual(words.filter((word) => names(word).join() !== names(word, { abbreviations: [] }).join()), []);
});

test('ranks a query writing an abbreviation or a full form in the plural as one writing it in the singular', () => {
  const names = (query) => search(tableSkills, query).map((r) => r.name);
  const listedPlurals = ABBREVIATIONS.flatMap(({ short }) => short.slice(1).map((plural) => [plural, short[0]]));
  const fullPlurals = [['pull requests', 'pull request'], ['repositories', 'repository'], ['databases', 'database']];
  const differing = [...listedPlurals, ...fullPlurals].filter(([plural, single]) => names(plural).join() !== names(single).join());
  assert.deepStrictEqual([listedPlurals.length > 0, differing], [true, []]);
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

test('returns every skill of one name as one result, in the order found, whichever of them matches', () => {
  const copies = ['/user', '/plugin', '/project'].map((root) => ({ ...skill('notes', 'Apply when notes are written'), path: `${root}/notes/SKILL.md` }));
  const found = copies.map((_, matching) => {
    const indexed = copies.map((copy, n) => (n === matching ? { ...copy, body: 'Run git bisect.' } : copy));
    return search([...indexed, ...skills], 'bisect');
  });
  const listed = { name: 'notes', skills: copies.map((copy) => ({ path: copy.path, description: copy.description })) };
  assert.deepStrictEqual(found, copies.map(() => [listed]));
});

test('lists the description of each skill of one name, so the agent picks among different ones', () => {
  const nested = [
    { ...skill('release-notes', 'Collects the merged pull requests since the last tag'), path: '/skills/release-notes/SKILL.md' },
    { ...skill('release-notes', 'Writes customer-facing release notes for a product version'), path: '/skills/documents/release-notes/SKILL.md' },
  ];
  const expected = [{ name: 'release-notes', skills: nested.map((s) => ({ path: s.path, description: s.description })) }];
  assert.deepStrictEqual([search(nested, 'merged pull requests'), search(nested, 'customer-facing')], [expected, expected]);
});

test('ranks a result by the best of the skills it lists', () => {
  const weak = { ...skill('deploy', 'Apply when a service changes'), path: '/a/deploy/SKILL.md' };
  const strong = { ...skill('deploy', 'Apply when a service is deployed with a rollback'), path: '/b/deploy/SKILL.md' };
  const other = skill('rollback-only', 'Apply when a rollback runs');
  assert.deepStrictEqual(search([weak, other, strong], 'rollback deploy').map((r) => r.name), ['deploy', 'rollback-only']);
});

test('matches a word of the request to another form of it in a description', () => {
  const results = search([skill('versions', 'Apply when tagging a release'), skill('notes', 'Apply when writing notes')], 'tag');
  assert.deepStrictEqual(results.map((r) => r.name), ['versions']);
});

test('returns at most ten results when no number is stated', () => {
  const many = Array.from({ length: 12 }, (_, n) => skill(`s${n}`, `Apply when writing code ${n}`));
  assert.strictEqual(search(many, 'writing code').length, 10);
});

test('returns at most the stated number of results, each a name with the path and description of its skills', () => {
  const results = search(skills, 'apply when', { limit: 2 });
  assert.strictEqual(results.length, 2);
  for (const r of results) {
    assert.deepStrictEqual(Object.keys(r).sort(), ['name', 'skills']);
    for (const s of r.skills) assert.deepStrictEqual(Object.keys(s).sort(), ['description', 'path']);
  }
});

test('reads the longest full form a query writes, whichever order the table lists the forms in', () => {
  const short = { short: ['pl'], full: ['pull'] };
  const long = { short: ['pr'], full: ['pull request'] };
  const corpus = [skill('pulls', 'Apply when a pull is made'), skill('requests', 'Apply when a PR is opened')];
  const orders = [[short, long], [long, short]].map((abbreviations) => search(corpus, 'pull request', { abbreviations }).map((r) => r.name));
  assert.deepStrictEqual(orders, [['requests'], ['requests']]);
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
