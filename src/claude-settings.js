'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function configDirOf(env, home = os.homedir()) {
  return env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
}

function projectDirOf(env, cwd) {
  return env.CLAUDE_PROJECT_DIR || cwd;
}

function settingsFilesByPrecedence(configDir, projectDir) {
  return [
    path.join(configDir, 'settings.json'),
    path.join(projectDir, '.claude', 'settings.json'),
    path.join(projectDir, '.claude', 'settings.local.json'),
  ];
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function cachedJsonReader() {
  const read = new Map();
  return (file) => {
    if (!read.has(file)) read.set(file, readJson(file));
    return read.get(file);
  };
}

module.exports = { cachedJsonReader, configDirOf, projectDirOf, readJson, settingsFilesByPrecedence };
