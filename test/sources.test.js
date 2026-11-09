'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { defaultRoots, resolveRoots } = require('../src/sources');
const { enable, installPlugin, writeJson } = require('../test-support/plugins');

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-sources-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('searches the skills folder of a user plugin and the paths its manifest adds', () => {
  const configDir = path.join(dir, 'user-plugin', 'config');
  const installPath = installPlugin(configDir, 'catalog@example', { scope: 'user' }, { skills: ['./extra/'] });
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir: path.join(dir, 'p') });
  const plugin = roots.filter((r) => r.source === 'plugin:catalog@example').map((r) => r.folder);
  assert.deepStrictEqual(plugin, [path.join(installPath, 'skills'), path.join(installPath, 'extra')]);
});

test('searches a project plugin only in the project it was installed for', () => {
  const configDir = path.join(dir, 'project-plugin', 'config');
  const projectDir = path.join(dir, 'project-plugin', 'here');
  fs.mkdirSync(projectDir, { recursive: true });
  installPlugin(configDir, 'mine@m', { scope: 'project', projectPath: projectDir });
  installPlugin(configDir, 'theirs@m', { scope: 'project', projectPath: path.join(dir, 'project-plugin', 'there') });
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir });
  const sources = roots.map((r) => r.source).filter((s) => s.startsWith('plugin:'));
  assert.deepStrictEqual(sources, ['plugin:mine@m']);
});

test('searches a plugin only where the settings nearest the project enable it', () => {
  const configDir = path.join(dir, 'enabled', 'config');
  const projectDir = path.join(dir, 'enabled', 'project');
  for (const id of ['absent@m', 'project-on@m', 'local-off@m']) installPlugin(configDir, id, { scope: 'user' });
  const userSettings = JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
  delete userSettings.enabledPlugins['absent@m'];
  userSettings.enabledPlugins['project-on@m'] = false;
  writeJson(path.join(configDir, 'settings.json'), userSettings);
  enable(path.join(projectDir, '.claude', 'settings.json'), 'project-on@m', true);
  enable(path.join(projectDir, '.claude', 'settings.local.json'), 'local-off@m', false);
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir });
  const sources = [...new Set(roots.map((r) => r.source).filter((s) => s.startsWith('plugin:')))];
  assert.deepStrictEqual(sources, ['plugin:project-on@m']);
});

test('searches a plugin only when every plugin it depends on loads, down the chain', () => {
  const configDir = path.join(dir, 'dependencies', 'config');
  const projectDir = path.join(dir, 'dependencies', 'project');
  installPlugin(configDir, 'base@m', { scope: 'user' });
  installPlugin(configDir, 'needs-base@m', { scope: 'user' }, { dependencies: ['base'] });
  installPlugin(configDir, 'off@m', { scope: 'user' });
  installPlugin(configDir, 'needs-off@m', { scope: 'user' }, { dependencies: [{ name: 'off', marketplace: 'm' }] });
  installPlugin(configDir, 'chain@m', { scope: 'user' }, { dependencies: ['needs-off@m@^1.0'] });
  installPlugin(configDir, 'needs-missing@m', { scope: 'user' }, { dependencies: ['missing@other'] });
  enable(path.join(configDir, 'settings.json'), 'off@m', false);
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir });
  const sources = [...new Set(roots.map((r) => r.source).filter((s) => s.startsWith('plugin:')))];
  assert.deepStrictEqual(sources, ['plugin:base@m', 'plugin:needs-base@m']);
});

test('skips a malformed plugin entry and keeps the other folders', () => {
  const configDir = path.join(dir, 'malformed', 'config');
  const good = installPlugin(configDir, 'good@m', { scope: 'user' });
  installPlugin(configDir, 'bad-manifest@m', { scope: 'user' }, { skills: { not: 'a path' } });
  const registry = JSON.parse(fs.readFileSync(path.join(configDir, 'plugins', 'installed_plugins.json'), 'utf8'));
  registry.plugins['object@m'] = { installPath: good, scope: 'user' };
  registry.plugins['null@m'] = null;
  registry.plugins['no-path@m'] = [{ scope: 'user' }];
  writeJson(path.join(configDir, 'plugins', 'installed_plugins.json'), registry);
  for (const id of ['object@m', 'null@m', 'no-path@m']) enable(path.join(configDir, 'settings.json'), id, true);
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir: path.join(dir, 'p') });
  assert.deepStrictEqual(
    roots.filter((r) => r.source.startsWith('plugin:')).map((r) => r.source),
    ['plugin:good@m', 'plugin:bad-manifest@m'],
  );
  assert.ok(roots.some((r) => r.source === 'claude-user'));
});

test("searches the user's and the project's Claude Code skill folders", () => {
  const configDir = path.join(dir, 'claude', 'config');
  const projectDir = path.join(dir, 'claude', 'project');
  const roots = defaultRoots({ configDir, codexHome: path.join(dir, 'none'), projectDir });
  assert.deepStrictEqual(roots.filter((r) => r.source.startsWith('claude-')), [
    { folder: path.join(configDir, 'skills'), source: 'claude-user', excluded: [path.join(configDir, 'skills', 'synced')] },
    { folder: path.join(projectDir, '.claude', 'skills'), source: 'claude-project', hiddenBy: 'claude-user' },
  ]);
});

test('searches only the configured folders when some are given', () => {
  const roots = resolveRoots({ folders: ['a', 'b'], env: {}, home: dir, cwd: dir });
  assert.deepStrictEqual(roots, [
    { folder: path.resolve(dir, 'a'), source: 'configured' },
    { folder: path.resolve(dir, 'b'), source: 'configured' },
  ]);
});

test('takes the configuration, Codex and project folders from the environment first', () => {
  const env = { CLAUDE_CONFIG_DIR: path.join(dir, 'cc'), CODEX_HOME: path.join(dir, 'cx'), CLAUDE_PROJECT_DIR: path.join(dir, 'pr') };
  const folders = resolveRoots({ folders: [], env, home: path.join(dir, 'home'), cwd: path.join(dir, 'cwd') }).map((r) => r.folder);
  assert.deepStrictEqual(folders, [
    path.join(dir, 'cc', 'skills'),
    path.join(dir, 'cx', 'skills'),
    path.join(dir, 'pr', '.claude', 'skills'),
    path.join(dir, 'pr', '.agents', 'skills'),
    path.join(dir, 'pr', '.codex', 'skills'),
    path.join(dir, 'cx', 'skills', '.system'),
  ]);
});

test('falls back to the home and working folders when the environment names none', () => {
  const home = path.join(dir, 'home');
  const cwd = path.join(dir, 'cwd');
  const folders = resolveRoots({ folders: [], env: {}, home, cwd }).map((r) => r.folder);
  assert.deepStrictEqual(folders, [
    path.join(home, '.claude', 'skills'),
    path.join(home, '.codex', 'skills'),
    path.join(cwd, '.claude', 'skills'),
    path.join(cwd, '.agents', 'skills'),
    path.join(cwd, '.codex', 'skills'),
    path.join(home, '.codex', 'skills', '.system'),
  ]);
});

test('searches the Codex project folders from the project up to the repository root', () => {
  const repo = path.join(dir, 'codex-walk', 'repo');
  const projectDir = path.join(repo, 'a', 'b');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  const roots = defaultRoots({ configDir: path.join(dir, 'none'), codexHome: path.join(dir, 'none'), projectDir });
  const folders = roots.filter((r) => r.source === 'codex-project').map((r) => r.folder);
  assert.deepStrictEqual(folders, [projectDir, path.join(repo, 'a'), repo].flatMap((d) => [
    path.join(d, '.agents', 'skills'),
    path.join(d, '.codex', 'skills'),
  ]));
});

test("searches the user's and the project's Codex skill folders", () => {
  const codexHome = path.join(dir, 'codex', 'home');
  const projectDir = path.join(dir, 'codex', 'project');
  const roots = defaultRoots({ configDir: path.join(dir, 'none'), codexHome, projectDir });
  assert.deepStrictEqual(roots.filter((r) => r.source.startsWith('codex-')), [
    { folder: path.join(codexHome, 'skills'), source: 'codex-user' },
    { folder: path.join(projectDir, '.agents', 'skills'), source: 'codex-project' },
    { folder: path.join(projectDir, '.codex', 'skills'), source: 'codex-project' },
    { folder: path.join(codexHome, 'skills', '.system'), source: 'codex-system' },
  ]);
});

test("lists the user's folders first, then the project's, then the plugins' and last the skills Codex ships", () => {
  const configDir = path.join(dir, 'order', 'config');
  const projectDir = path.join(dir, 'order', 'project');
  installPlugin(configDir, 'tools@m', {});
  writeJson(path.join(configDir, '.claude.json'), { oauthAccount: { organizationUuid: 'org-1', accountUuid: 'acc-1' } });
  const roots = defaultRoots({ configDir, claudeStateFile: path.join(configDir, '.claude.json'),
    codexHome: path.join(dir, 'order', 'codex'), projectDir });
  const sources = roots.map((r) => r.source).filter((source, n, all) => all.indexOf(source) === n);
  assert.deepStrictEqual(sources,
    ['claude-user', 'claude-synced', 'codex-user', 'claude-project', 'codex-project', 'plugin:tools@m', 'codex-system']);
});

const account = { organizationUuid: 'org-1', accountUuid: 'acc-2' };

test('searches the claude.ai skills synced for the account Claude Code is signed in to, after the user skills', () => {
  const home = path.join(dir, 'synced', 'home');
  const configDir = path.join(dir, 'synced', 'config');
  writeJson(path.join(configDir, '.claude.json'), { oauthAccount: account });
  writeJson(path.join(home, '.claude.json'), { oauthAccount: { organizationUuid: 'org-9', accountUuid: 'acc-9' } });
  const syncedOf = (env) => resolveRoots({ folders: [], env, home, cwd: path.join(dir, 'synced', 'cwd') })
    .filter((r) => r.source.startsWith('claude-user') || r.source === 'claude-synced').map((r) => r.folder);
  assert.deepStrictEqual([syncedOf({ CLAUDE_CONFIG_DIR: configDir }), syncedOf({})], [
    [path.join(configDir, 'skills'), path.join(configDir, 'skills', 'synced', 'org-1_acc-2')],
    [path.join(home, '.claude', 'skills'), path.join(home, '.claude', 'skills', 'synced', 'org-9_acc-9')],
  ]);
});

test('searches no synced folder when the account Claude Code is signed in to is missing or names no plain folder', () => {
  const states = [{ userID: 'local' }, { oauthAccount: { organizationUuid: '..', accountUuid: '..' } }, { oauthAccount: { organizationUuid: 'org-1' } }];
  const synced = states.map((state, n) => {
    const configDir = path.join(dir, 'unsigned', String(n));
    writeJson(path.join(configDir, '.claude.json'), state);
    const roots = resolveRoots({ folders: [], env: { CLAUDE_CONFIG_DIR: configDir }, home: path.join(dir, 'unsigned', 'home'), cwd: dir });
    return roots.filter((r) => r.source === 'claude-synced');
  });
  assert.deepStrictEqual(synced, [[], [], []]);
});
