'use strict';
const fs = require('node:fs');
const path = require('node:path');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
}

function enable(settingsFile, id, value) {
  const current = readJson(settingsFile) ?? {};
  current.enabledPlugins = { ...current.enabledPlugins, [id]: value };
  writeJson(settingsFile, current);
}

function installPlugin(configDir, id, entry, manifest = {}, settingsFile = path.join(configDir, 'settings.json')) {
  enable(settingsFile, id, true);
  const installPath = entry.installPath ?? path.join(configDir, 'plugins', 'cache', id.replace('@', '-'));
  writeJson(path.join(installPath, '.claude-plugin', 'plugin.json'), { name: id.split('@')[0], ...manifest });
  const registry = path.join(configDir, 'plugins', 'installed_plugins.json');
  const current = readJson(registry) ?? { version: 2, plugins: {} };
  current.plugins[id] = [{ installPath, version: '1.0.0', ...entry }];
  writeJson(registry, current);
  return installPath;
}

module.exports = { enable, installPlugin, readJson, writeJson };
