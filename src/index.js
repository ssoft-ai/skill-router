'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseSkillFile } = require('./frontmatter');
const { existingRealPath, samePath } = require('./paths');

const SKILL_FILE = 'SKILL.md';
const DEFAULT_MAX_ENTRIES = 200000;
const MAX_SKILL_BYTES = 1024 * 1024;

function buildIndex(roots, { maxEntries = DEFAULT_MAX_ENTRIES, cache = new Map() } = {}) {
  const visited = new Set();
  const found = [];
  const indexed = new Set();
  const namesBySource = new Set();
  for (const { folder, source, excluded = [], hiddenBy } of roots) {
    const skipped = excluded.map(existingRealPath).filter(Boolean);
    for (const file of findSkillFiles(folder, { visited, entriesLeft: maxEntries, skipped })) {
      if (indexed.has(file)) continue;
      const skill = cachedSkill(file, source, cache);
      if (!skill) continue;
      indexed.add(file);
      found.push({ skill, hiddenBy });
      namesBySource.add(sourceAndName(source, skill.name));
    }
  }
  for (const file of cache.keys()) if (!indexed.has(file)) cache.delete(file);
  const skills = found.filter(({ skill, hiddenBy }) => !hiddenBy || !namesBySource.has(sourceAndName(hiddenBy, skill.name)));
  return { skills: skills.map(({ skill }) => skill) };
}

const sourceAndName = (source, name) => JSON.stringify([source, name]);

function cachedSkill(file, source, cache) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  if (stat.size > MAX_SKILL_BYTES) {
    cache.delete(file);
    return null;
  }
  const entry = cache.get(file);
  if (entry && entry.source === source && entry.mtimeMs === stat.mtimeMs && entry.size === stat.size) return entry.skill;
  const skill = readSkill(file, source, stat.size);
  if (skill) cache.set(file, { source, mtimeMs: stat.mtimeMs, size: stat.size, skill });
  else cache.delete(file);
  return skill;
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
    if (isServiceFolderName(entry.name) || walk.skipped.some((skipped) => samePath(skipped, entryPath))) continue;
    if (entry.isDirectory() || (entry.isSymbolicLink() && isFolder(entryPath))) {
      found.push(...findSkillFiles(entryPath, walk));
    } else if (entry.name === SKILL_FILE && isFile(entryPath)) {
      found.push(entryPath);
    }
  }
  return found;
}

const isServiceFolderName = (name) => name.startsWith('.') || name === 'node_modules';

function isFolder(link) {
  try {
    return fs.statSync(link).isDirectory();
  } catch {
    return false;
  }
}

function isFile(entryPath) {
  try {
    return fs.statSync(entryPath).isFile();
  } catch {
    return false;
  }
}

const text = (value) => (typeof value === 'string' ? value : '');

function readAtMost(file, limit, expectedSize) {
  const fd = fs.openSync(file, 'r');
  try {
    let buffer = Buffer.allocUnsafe(Math.min(expectedSize ?? limit, limit) + 1);
    let length = 0;
    for (;;) {
      const read = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (read === 0) break;
      length += read;
      if (length > limit) return null;
      if (length === buffer.length) buffer = Buffer.concat([buffer, Buffer.allocUnsafe(Math.min(length, limit + 1 - length))]);
    }
    return buffer.toString('utf8', 0, length);
  } finally {
    fs.closeSync(fd);
  }
}

const readSkillText = (file, expectedSize) => readAtMost(file, MAX_SKILL_BYTES, expectedSize);

const firstLineOf = (body) => (body.split('\n').find((line) => line.trim()) ?? '').replace(/^\s*#+/, '').trim();

function readSkill(file, source, size) {
  let data;
  let body;
  try {
    const content = readSkillText(file, size);
    if (content === null) return null;
    ({ data, body } = parseSkillFile(content));
  } catch {
    return null;
  }
  const metadata = data?.metadata;
  return {
    name: text(data?.name) || path.basename(path.dirname(file)),
    description: text(data?.description) || firstLineOf(body),
    body,
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
    path: file,
    folder: path.dirname(file),
    source,
  };
}

module.exports = { buildIndex, readSkillText };
