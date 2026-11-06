'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseSkillFile } = require('./frontmatter');

const SKILL_FILE = 'SKILL.md';
const DEFAULT_MAX_ENTRIES = 200000;

function buildIndex(roots, { maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
  const visited = new Set();
  const skills = [];
  const indexed = new Set();
  for (const { folder, source } of roots) {
    for (const file of findSkillFiles(folder, { visited, entriesLeft: maxEntries })) {
      if (indexed.has(file)) continue;
      const skill = readSkill(file, source);
      if (!skill) continue;
      indexed.add(file);
      skills.push(skill);
    }
  }
  return { skills };
}

function findSkillFiles(folder, walk) {
  let real;
  let entries;
  try {
    real = fs.realpathSync.native(folder);
    entries = fs.readdirSync(real, { withFileTypes: true });
  } catch {
    return [];
  }
  if (walk.visited.has(real)) return [];
  walk.visited.add(real);
  const found = [];
  for (const entry of entries) {
    if (walk.entriesLeft-- <= 0) break;
    const entryPath = path.join(real, entry.name);
    if (entry.name === '.git') continue;
    if (entry.isDirectory() || (entry.isSymbolicLink() && isFolder(entryPath))) {
      found.push(...findSkillFiles(entryPath, walk));
    } else if (entry.name === SKILL_FILE) {
      const file = realSkillFile(entryPath);
      if (file) found.push(file);
    }
  }
  return found;
}

function isFolder(link) {
  try {
    return fs.statSync(link).isDirectory();
  } catch {
    return false;
  }
}

function realSkillFile(entryPath) {
  try {
    const file = fs.realpathSync.native(entryPath);
    return path.basename(file) === SKILL_FILE && fs.statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

const text = (value) => (typeof value === 'string' ? value : '');

function readSkill(file, source) {
  let data;
  try {
    data = parseSkillFile(fs.readFileSync(file, 'utf8')).data;
  } catch {
    return null;
  }
  const metadata = data?.metadata;
  return {
    name: text(data?.name) || path.basename(path.dirname(file)),
    description: text(data?.description),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    path: file,
    folder: path.dirname(file),
    source,
  };
}

module.exports = { buildIndex };
