#!/usr/bin/env node
'use strict';
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { cachedJsonReader, configDirOf, projectDirOf, readJson, settingsFilesByPrecedence } = require('../src/claude-settings');
const { settleListing } = require('../src/listing');
const { existingRealPath, samePath } = require('../src/paths');
const { loadedPlugins } = require('../src/sources');

const OPTION = 'skill_names_only';

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    settle(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
  } catch (error) {
    process.stderr.write(`skill-router: the skill listing was left as it is: ${error.message}\n`);
  }
});

function settle(input) {
  const env = process.env;
  const read = cachedJsonReader();
  const configDir = configDirOf(env);
  const projectDir = projectDirOf(env, input.cwd || process.cwd());
  const name = read(path.join(env.CLAUDE_PLUGIN_ROOT ?? '', '.claude-plugin', 'plugin.json'))?.name ?? 'skill-router';
  const settingsFiles = settingsFilesByPrecedence(configDir, projectDir);
  const ids = [...loadedPlugins(configDir, projectDir, read).keys()].filter((id) => id.split('@')[0] === name);
  const namesOnly = ids.length > 0 && optionOn(env, ids, settingsFiles, read)
    && (input.hook_event_name !== 'SessionEnd' || anotherSessionOpen(configDir, projectDir, input.session_id));
  const settingsFile = settingsFiles.at(-1);
  settleListing({
    settingsFile,
    otherSettingsFiles: settingsFiles.slice(0, -1),
    stateFile: path.join(configDir, 'plugins', `${name}-listing`, `${recordName(settingsFile)}.json`),
    namesOnly,
    read,
  });
}

function recordName(settingsFile) {
  const resolved = path.resolve(settingsFile);
  return createHash('sha256').update(process.platform === 'win32' ? resolved.toLowerCase() : resolved).digest('hex').slice(0, 32);
}

function anotherSessionOpen(configDir, projectDir, sessionId) {
  const folder = path.join(configDir, 'sessions');
  let files;
  try {
    files = fs.readdirSync(folder);
  } catch {
    return false;
  }
  const project = existingRealPath(projectDir) ?? path.resolve(projectDir);
  return files.some((file) => {
    const pid = /^(\d+)\.json$/.exec(file)?.[1];
    if (pid === undefined || !running(Number(pid))) return false;
    const session = readJson(path.join(folder, file));
    if (typeof session?.sessionId !== 'string' || typeof session.cwd !== 'string') {
      process.stderr.write(`skill-router: ${file} names no session and folder, so the skill listing stays shortened\n`);
      return true;
    }
    return session.sessionId !== sessionId && samePath(existingRealPath(session.cwd) ?? path.resolve(session.cwd), project);
  });
}

function running(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function optionOn(env, ids, settingsFiles, read) {
  const fromEnv = env[`CLAUDE_PLUGIN_OPTION_${OPTION.toUpperCase()}`] ?? env[`CLAUDE_PLUGIN_OPTION_${OPTION}`];
  if (fromEnv !== undefined) return fromEnv === 'true' || fromEnv === '1';
  for (const file of settingsFiles.slice().reverse()) {
    for (const id of ids) {
      const value = read(file)?.pluginConfigs?.[id]?.options?.[OPTION];
      if (value !== undefined) return value === true || value === 'true';
    }
  }
  return true;
}
