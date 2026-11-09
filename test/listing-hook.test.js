'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { enable, installPlugin, readJson, writeJson } = require('../test-support/plugins');

const hookPath = path.join(__dirname, '..', 'hooks', 'listing.js');
const ID = 'skill-router@ssoft-ai';
const KEY = 'skillListingMaxDescChars';

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-listing-hook-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

let cases = 0;
function install({ scope = 'user', options } = {}) {
  const root = path.join(dir, String(++cases));
  const configDir = path.join(root, 'config');
  const projectDir = path.join(root, 'project');
  const pluginRoot = path.join(root, 'plugin');
  const userSettings = path.join(configDir, 'settings.json');
  fs.mkdirSync(projectDir, { recursive: true });
  const entry = { scope, installPath: pluginRoot, ...(scope === 'user' ? {} : { projectPath: projectDir }) };
  installPlugin(configDir, ID, entry, {}, scope === 'user' ? userSettings : path.join(projectDir, '.claude', 'settings.json'));
  if (options) writeJson(userSettings, { ...readJson(userSettings), pluginConfigs: { [ID]: { options } } });
  return { configDir, projectDir, pluginRoot, userSettings, localSettings: path.join(projectDir, '.claude', 'settings.local.json') };
}

function run(setup, { event = 'SessionStart', option } = {}) {
  const env = { ...process.env, CLAUDE_CONFIG_DIR: setup.configDir, CLAUDE_PLUGIN_ROOT: setup.pluginRoot,
    CLAUDE_PROJECT_DIR: setup.projectDir };
  delete env.CLAUDE_PLUGIN_OPTION_SKILL_NAMES_ONLY;
  if (option !== undefined) env.CLAUDE_PLUGIN_OPTION_SKILL_NAMES_ONLY = option;
  return spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ hook_event_name: event, session_id: 'this-session', cwd: setup.projectDir }), env, encoding: 'utf8' });
}

function openSession(setup, pid, session) {
  writeJson(path.join(setup.configDir, 'sessions', `${pid}.json`), { pid, ...session });
}

const endedPid = () => Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout);
const listing = (file) => readJson(file)?.[KEY];

test('shortens the listing in the local settings of the session project for a user install, leaving the user settings alone, and adds nothing to the context', () => {
  const setup = install();
  const result = run(setup);
  assert.deepStrictEqual([result.status, result.stdout, listing(setup.localSettings), listing(setup.userSettings)], [0, '', 1, undefined]);
});

test('shortens the listing in the local settings of the project a project install serves', () => {
  const setup = install({ scope: 'project' });
  run(setup);
  assert.deepStrictEqual([listing(setup.localSettings), listing(setup.userSettings)], [1, undefined]);
});

test('leaves the listing as it is while the mode is off', () => {
  const setup = install();
  run(setup, { option: 'false' });
  assert.strictEqual(fs.existsSync(setup.localSettings), false);
});

test('takes the mode from the plugin options in the settings when the environment does not carry it', () => {
  const setup = install({ options: { skill_names_only: false } });
  run(setup);
  assert.strictEqual(fs.existsSync(setup.localSettings), false);
});

test('restores the listing once the mode is turned off', () => {
  const setup = install();
  writeJson(setup.localSettings, { model: 'opus' });
  run(setup, { option: 'true' });
  run(setup, { event: 'ConfigChange', option: 'false' });
  assert.deepStrictEqual(readJson(setup.localSettings), { model: 'opus' });
});

test('restores the listing once the router is disabled, whatever the mode', () => {
  const setup = install();
  writeJson(setup.localSettings, { model: 'opus' });
  run(setup, { option: 'true' });
  enable(setup.userSettings, ID, false);
  run(setup, { event: 'ConfigChange', option: 'true' });
  assert.deepStrictEqual(readJson(setup.localSettings), { model: 'opus' });
});

test('restores the listing once the router is uninstalled, whatever the mode', () => {
  const setup = install();
  writeJson(setup.localSettings, { model: 'opus' });
  run(setup, { option: 'true' });
  writeJson(path.join(setup.configDir, 'plugins', 'installed_plugins.json'), { version: 2, plugins: {} });
  run(setup, { event: 'SessionEnd', option: 'true' });
  assert.deepStrictEqual(readJson(setup.localSettings), { model: 'opus' });
});

test('removes the settings file and the folder it created once the last session of the project ends', () => {
  const setup = install();
  run(setup);
  run(setup, { event: 'SessionEnd' });
  assert.strictEqual(fs.existsSync(path.dirname(setup.localSettings)), false);
});

test('keeps the listing when a session ends while another session of the same project is open', () => {
  const setup = install();
  openSession(setup, process.pid, { sessionId: 'other-session', cwd: setup.projectDir });
  run(setup);
  run(setup, { event: 'SessionEnd' });
  assert.strictEqual(listing(setup.localSettings), 1);
});

test('restores the listing when a session ends while the only other open session works in another project', () => {
  const setup = install();
  openSession(setup, process.pid, { sessionId: 'other-session', cwd: dir });
  run(setup);
  run(setup, { event: 'SessionEnd' });
  assert.strictEqual(listing(setup.localSettings), undefined);
});

test('restores the listing when a session ends and the other session left behind names a process that ended', () => {
  const setup = install();
  fs.mkdirSync(path.join(setup.configDir, 'sessions'), { recursive: true });
  fs.writeFileSync(path.join(setup.configDir, 'sessions', `${endedPid()}.json`), 'not json');
  run(setup);
  const result = run(setup, { event: 'SessionEnd' });
  assert.deepStrictEqual([listing(setup.localSettings), result.stderr], [undefined, '']);
});

test('keeps the listing and says why when the file of a running session names no session or folder', () => {
  const setup = install();
  openSession(setup, process.pid, { id: 'renamed-field' });
  run(setup);
  const result = run(setup, { event: 'SessionEnd' });
  assert.deepStrictEqual([listing(setup.localSettings), /names no session/.test(result.stderr)], [1, true]);
});

test('keeps the record of each project in a file of its own, so the hooks of two projects running at once lose neither', () => {
  const setup = install();
  const other = { ...setup, projectDir: path.join(path.dirname(setup.projectDir), 'other-project') };
  fs.mkdirSync(other.projectDir, { recursive: true });
  run(setup);
  run(other);
  const records = fs.readdirSync(path.join(setup.configDir, 'plugins', 'skill-router-listing'));
  assert.strictEqual(records.length, 2);
});
