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

test('asks for a term both as its abbreviation and in full in the query', () => {
  const { tools } = router.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).result;
  assert.match(tools[0].inputSchema.properties.query.description, /abbreviation and in full/);
});

test('finds a nested skill and loads it by the path the search returned', () => {
  const [found] = JSON.parse(call('search_skills', { query: 'commit message' }).content[0].text);
  const loaded = call('load_skill', { path: found.path });
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
