'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { configDirOf, projectDirOf, readJson, settingsFilesByPrecedence } = require('./claude-settings');
const { existingRealPath, samePath } = require('./paths');

function resolveRoots({ folders, env, home, cwd }) {
  if (folders.length > 0) return folders.map((folder) => ({ folder: path.resolve(cwd, folder), source: 'configured' }));
  return defaultRoots({
    configDir: configDirOf(env, home),
    claudeStateFile: env.CLAUDE_CONFIG_DIR ? path.join(env.CLAUDE_CONFIG_DIR, '.claude.json') : path.join(home, '.claude.json'),
    codexHome: env.CODEX_HOME || path.join(home, '.codex'),
    projectDir: projectDirOf(env, cwd),
  });
}

function defaultRoots({ configDir, claudeStateFile, codexHome, projectDir }) {
  const syncedFolder = path.join(configDir, 'skills', 'synced');
  return [
    { folder: path.join(configDir, 'skills'), source: 'claude-user', excluded: [syncedFolder] },
    ...syncedAccountRoots(syncedFolder, claudeStateFile),
    { folder: path.join(codexHome, 'skills'), source: 'codex-user' },
    { folder: path.join(projectDir, '.claude', 'skills'), source: 'claude-project', hiddenBy: 'claude-user' },
    ...foldersUpToRepositoryRoot(projectDir).flatMap((dir) => [
      { folder: path.join(dir, '.agents', 'skills'), source: 'codex-project' },
      { folder: path.join(dir, '.codex', 'skills'), source: 'codex-project' },
    ]),
    ...pluginRoots(configDir, projectDir),
    { folder: path.join(codexHome, 'skills', '.system'), source: 'codex-system' },
  ];
}

function syncedAccountRoots(syncedFolder, claudeStateFile) {
  const account = claudeStateFile && readJson(claudeStateFile)?.oauthAccount;
  const ids = [account?.organizationUuid, account?.accountUuid];
  if (!ids.every((id) => typeof id === 'string' && /^[0-9A-Za-z-]+$/.test(id))) return [];
  return [{ folder: path.join(syncedFolder, ids.join('_')), source: 'claude-synced' }];
}

function foldersUpToRepositoryRoot(projectDir) {
  const folders = [];
  for (let dir = path.resolve(projectDir); ; dir = path.dirname(dir)) {
    folders.push(dir);
    if (fs.existsSync(path.join(dir, '.git'))) return folders;
    if (path.dirname(dir) === dir) return [path.resolve(projectDir)];
  }
}

function pluginRoots(configDir, projectDir) {
  const roots = [];
  for (const [id, manifests] of loadedPlugins(configDir, projectDir)) {
    for (const { install, manifest } of manifests) {
      const declared = [manifest.skills ?? []].flat().filter((folder) => typeof folder === 'string');
      for (const folder of ['skills', ...declared]) {
        roots.push({ folder: path.resolve(install.installPath, folder), source: `plugin:${id}` });
      }
    }
  }
  return roots;
}

function loadedPlugins(configDir, projectDir, read = readJson) {
  const registry = read(path.join(configDir, 'plugins', 'installed_plugins.json'));
  const enabled = enabledPlugins(configDir, projectDir, read);
  const installed = new Map();
  for (const [id, installs] of Object.entries(registry?.plugins ?? {})) {
    if (enabled[id] !== true || !Array.isArray(installs)) continue;
    const active = installs.filter((install) => typeof install?.installPath === 'string'
      && (typeof install.projectPath !== 'string' || isProject(install.projectPath, projectDir)));
    if (active.length === 0) continue;
    const manifests = active.map((install) => ({
      install,
      manifest: read(path.join(install.installPath, '.claude-plugin', 'plugin.json')) ?? {},
    }));
    installed.set(id, manifests);
  }
  const loads = loadingPlugins(installed);
  return new Map([...installed].filter(([id]) => loads(id)));
}

function loadingPlugins(installed) {
  const verdicts = new Map();
  const loads = (id) => {
    if (!verdicts.has(id)) {
      verdicts.set(id, true);
      const manifests = installed.get(id);
      verdicts.set(id, Boolean(manifests) && manifests.every(({ manifest }) => (
        [manifest.dependencies ?? []].flat().every((dependency) => loads(dependencyId(dependency, id))))));
    }
    return verdicts.get(id);
  };
  return loads;
}

function dependencyId(dependency, dependentId) {
  const marketplace = dependentId.split('@')[1];
  if (dependency && typeof dependency === 'object') {
    return `${dependency.name}@${dependency.marketplace ?? marketplace}`;
  }
  const name = String(dependency).replace(/@\^[^@]*$/, '');
  return name.includes('@') ? name : `${name}@${marketplace}`;
}

function enabledPlugins(configDir, projectDir, read) {
  const settingsFiles = settingsFilesByPrecedence(configDir, projectDir);
  return Object.assign({}, ...settingsFiles.map((file) => read(file)?.enabledPlugins ?? {}));
}

function isProject(installedFor, projectDir) {
  const canonical = (p) => existingRealPath(p) ?? path.resolve(p);
  return samePath(canonical(installedFor), canonical(projectDir));
}

module.exports = { defaultRoots, loadedPlugins, resolveRoots };
