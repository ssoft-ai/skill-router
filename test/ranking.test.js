'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { search } = require('../src/search');

// Queries an agent wrote on Haiku for the Russian requests of evals/router, each naming the catalog skill the request was for.
const queries = require('./fixtures/ranking/queries.json');
const bodyOf = (skillPath) => fs.readFileSync(path.join(__dirname, 'fixtures', 'catalog', 'bodies', `${path.dirname(skillPath)}.md`), 'utf8');
const skills = require('./fixtures/catalog/skills.json').map((s) => ({ ...s, metadata: {}, body: bodyOf(s.path) }));

function rankOf({ query, expect }) {
  const i = search(skills, query, { limit: 20 }).findIndex((r) => r.path === expect || (r.otherPaths ?? []).includes(expect));
  return i < 0 ? Infinity : i + 1;
}

test('ranks the skill an agent query targets within the default results for nineteen queries in twenty', (t) => {
  const ranks = queries.map(rankOf);
  const share = (k) => ranks.filter((r) => r <= k).length / queries.length;
  t.diagnostic(`top 1 ${share(1).toFixed(2)}, top 3 ${share(3).toFixed(2)}, top 5 ${share(5).toFixed(2)}, top 10 ${share(10).toFixed(2)} of ${queries.length}`);
  assert.ok(share(10) >= 0.95, `top 10 holds ${share(10).toFixed(2)} of the targets`);
});

test('ranks the skill an agent query targets first for most queries', () => {
  const share = queries.map(rankOf).filter((r) => r === 1).length / queries.length;
  assert.ok(share >= 0.85, `top 1 holds ${share.toFixed(2)} of the targets`);
});

test('ranks the skill an agent query targets within the first three for most queries', () => {
  const share = queries.map(rankOf).filter((r) => r <= 3).length / queries.length;
  assert.ok(share >= 0.85, `top 3 holds ${share.toFixed(2)} of the targets`);
});

test('ranks the skill an agent query targets within the first five for nine queries in ten', () => {
  const share = queries.map(rankOf).filter((r) => r <= 5).length / queries.length;
  assert.ok(share >= 0.9, `top 5 holds ${share.toFixed(2)} of the targets`);
});

const queriesByTermTheDescriptionLacks = require('./fixtures/ranking/term-queries.json');

test('ranks within the first ten the skill a query targets by a term its description does not hold', () => {
  const missed = queriesByTermTheDescriptionLacks.filter((q) => rankOf(q) > 10).map((q) => q.query);
  assert.deepStrictEqual(missed, []);
});
