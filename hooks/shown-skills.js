#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSkill } = require('../src/index');
const { loadedFolder, searchedNames } = require('../src/texts');

const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  let message;
  try {
    message = messageFor(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    return;
  }
  if (message) process.stdout.write(JSON.stringify({ systemMessage: message }));
});

function messageFor({ tool_name: tool, tool_response: response }) {
  const text = textOf(response);
  if (tool.endsWith('__search_skills')) {
    const names = searchedNames(text);
    if (names === null) return null;
    return names.length > 0 ? `Skills found: ${names.join(', ')}` : 'No skill found';
  }
  if (tool.endsWith('__load_skill')) {
    const shown = loadedFolder(text);
    if (shown === null) return null;
    return `Skill loaded: ${nameOf(shown.replace(/^~(?=[\\/])/, os.homedir()))}`;
  }
  return null;
}

function nameOf(folder) {
  const file = path.join(folder, 'SKILL.md');
  try {
    return readSkill(file, undefined, fs.statSync(file).size)?.name ?? path.basename(folder);
  } catch {
    return path.basename(folder);
  }
}

function textOf(response) {
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) return response.map((block) => block?.text ?? '').join('\n');
  return textOf(response?.content ?? '');
}
