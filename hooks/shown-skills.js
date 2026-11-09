#!/usr/bin/env node
'use strict';
const os = require('node:os');
const path = require('node:path');
const { readSkill } = require('../src/index');
const { oneLine } = require('../src/one-line');
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
    const folder = shown.replace(/^~(?=[\\/])/, os.homedir());
    return `Skill loaded: ${oneLine(readSkill(path.join(folder, 'SKILL.md'))?.name ?? path.basename(folder))}`;
  }
  return null;
}

function textOf(response) {
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) return response.map((block) => block?.text ?? '').join('\n');
  return textOf(response?.content ?? '');
}
