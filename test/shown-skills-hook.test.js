'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRouter } = require('../src/router');

const hookPath = path.join(__dirname, '..', 'hooks', 'shown-skills.js');
const hooksFile = path.join(__dirname, '..', 'hooks', 'hooks.json');
const TOOL = 'mcp__plugin_skill-router_skill-router__';

let dir;
let router;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-shown-'));
  const skills = path.join(dir, 'skills');
  const write = (folder, frontmatter) => {
    fs.mkdirSync(path.join(skills, folder), { recursive: true });
    fs.writeFileSync(path.join(skills, folder, 'SKILL.md'), `---\n${frontmatter}\n---\nFollow the rules.\n`);
  };
  write('pr-folder', 'name: pr-rules\ndescription: Apply when writing a pull request description');
  write('commit-rules', 'name: commit-rules\ndescription: Apply when writing a commit message');
  write('changelog', 'description: Apply when writing a changelog entry');
  router = createRouter({ folders: [skills], env: {}, home: dir, cwd: dir });
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const call = (name, args) => router.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }).result;

function run(tool, args) {
  const response = call(tool, args).content;
  const env = { ...process.env, HOME: dir, USERPROFILE: dir };
  const input = { hook_event_name: 'PostToolUse', tool_name: `${TOOL}${tool}`, tool_input: args, tool_response: response };
  return spawnSync(process.execPath, [hookPath], { input: JSON.stringify(input), env, encoding: 'utf8' });
}

const shown = (result) => (result.stdout ? JSON.parse(result.stdout) : null);

test('shows the user the names a search returned and adds nothing to the context', () => {
  const result = run('search_skills', { query: 'writing a commit message or a pull request description' });
  assert.deepStrictEqual([result.status, shown(result)], [0, { systemMessage: 'Skills found: commit-rules, pr-rules, changelog' }]);
});

test('shows the names a search returned and none of the skills stored inside them', () => {
  const skills = path.join(dir, 'nested-skills');
  for (const [folder, name, description] of [['mobile', 'mobile', 'Apply when phone apps are built'], [path.join('mobile', 'kite-switches'), 'kite-switches', 'Apply when Kite flips']]) {
    fs.mkdirSync(path.join(skills, folder), { recursive: true });
    fs.writeFileSync(path.join(skills, folder, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n`);
  }
  const nested = createRouter({ folders: [skills], env: {}, home: dir, cwd: dir });
  const args = { query: 'phone apps', limit: 1 };
  const response = nested.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_skills', arguments: args } }).result.content;
  const input = { hook_event_name: 'PostToolUse', tool_name: `${TOOL}search_skills`, tool_input: args, tool_response: response };
  const result = spawnSync(process.execPath, [hookPath], { input: JSON.stringify(input), encoding: 'utf8' });
  assert.deepStrictEqual(shown(result), { systemMessage: 'Skills found: mobile' });
});

test('shows on one line the name of a loaded skill written over several lines', () => {
  const skills = path.join(dir, 'block-names');
  fs.mkdirSync(path.join(skills, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(skills, 'notes', 'SKILL.md'), '---\nname: |\n  release\n  notes\ndescription: Apply when notes are written\n---\nBody.\n');
  const blocks = createRouter({ folders: [skills], env: {}, home: path.join(dir, 'elsewhere'), cwd: dir });
  const args = { path: path.join(skills, 'notes') };
  const response = blocks.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'load_skill', arguments: args } }).result.content;
  const input = { hook_event_name: 'PostToolUse', tool_name: `${TOOL}load_skill`, tool_input: args, tool_response: response };
  const result = spawnSync(process.execPath, [hookPath], { input: JSON.stringify(input), encoding: 'utf8' });
  assert.deepStrictEqual(shown(result), { systemMessage: 'Skill loaded: release notes' });
});

test('shows the user that a search found no skill', () => {
  assert.deepStrictEqual(shown(run('search_skills', { query: 'zzzz qqqq' })), { systemMessage: 'No skill found' });
});

test('shows the user the name of a loaded skill, which its folder name may differ from', () => {
  const folder = call('search_skills', { query: 'pull request description' }).content[0].text.split('\n')[1].trim();
  assert.deepStrictEqual(shown(run('load_skill', { path: folder })), { systemMessage: 'Skill loaded: pr-rules' });
});

test('shows a loaded skill without a name by its folder, as the search lists it', () => {
  const folder = call('search_skills', { query: 'changelog entry' }).content[0].text.split('\n')[1].trim();
  assert.deepStrictEqual(shown(run('load_skill', { path: folder })), { systemMessage: 'Skill loaded: changelog' });
});

test('shows no skill name for a search the router refused', () => {
  const result = run('search_skills', { query: '' });
  assert.deepStrictEqual([result.status, result.stdout], [0, '']);
});

test('shows nothing for an input it cannot read', () => {
  const result = spawnSync(process.execPath, [hookPath], { input: '{', encoding: 'utf8' });
  assert.deepStrictEqual([result.status, result.stdout], [0, '']);
});

test('runs after the search and the load of the router and after no other tool', () => {
  const matchers = JSON.parse(fs.readFileSync(hooksFile, 'utf8')).hooks.PostToolUse
    .filter((entry) => entry.hooks.some((hook) => hook.command.includes('shown-skills.js')))
    .map((entry) => new RegExp(entry.matcher));
  const runsAfter = (tool) => matchers.some((matcher) => matcher.test(tool));
  assert.deepStrictEqual(
    [`${TOOL}search_skills`, `${TOOL}load_skill`, `${TOOL}other`, 'Read', 'mcp__other__search_skills', `${TOOL}search_skills_preview`, 'mcp__plugin_skill-router-dev_skill-router__load_skill'].map(runsAfter),
    [true, true, false, false, false, false, true]);
});
