'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseSkillFile } = require('./frontmatter');
const { existingRealPath, samePath } = require('./paths');
const { oneLine } = require('./one-line');

const SKILL_FILE = 'SKILL.md';
const DEFAULT_MAX_ENTRIES = 200000;
const MAX_SKILL_BYTES = 1024 * 1024;

function buildIndex(roots, { maxEntries = DEFAULT_MAX_ENTRIES, cache = new Map() } = {}) {
  const visited = new Set();
  const indexed = new Map();
  const namesBySource = new Set();
  const take = (found, { source, hiddenBy, real }) => {
    for (const { file, stat, place } of found) {
      if (indexed.has(file)) continue;
      const skill = cachedSkill(file, source, cache, stat);
      if (!skill) continue;
      indexed.set(file, { skill, hiddenBy, root: real, place: path.dirname(place) });
      namesBySource.add(sourceAndName(source, skill.name));
    }
  };
  const walks = [];
  for (const { folder, source, excluded = [], hiddenBy } of roots) {
    const real = existingRealPath(folder);
    if (!real) continue;
    const skipped = excluded.map(existingRealPath).filter(Boolean);
    const walk = { visited, entriesLeft: maxEntries, skipped, links: [], root: { source, hiddenBy, real } };
    take(walkRealFolder(real, walk, real), walk.root);
    walks.push(walk);
  }
  for (const walk of walks) {
    for (let n = 0; n < walk.links.length; n++) take(followLink(walk.links[n].link, walk, walk.links[n].place), walk.root);
  }
  for (const file of cache.keys()) if (!indexed.has(file)) cache.delete(file);
  const hidden = (hiddenBy, skill) => Boolean(hiddenBy) && namesBySource.has(sourceAndName(hiddenBy, skill.name));
  const listed = [...indexed.values()].filter(({ skill, hiddenBy }) => !hidden(hiddenBy, skill));
  const skills = listed.map(({ skill }) => skill);
  const atPlace = new Map(listed.map((entry) => [entry.place, entry]));
  const held = new Set();
  const heldBy = new Map();
  for (const entry of listed) {
    for (let up = path.dirname(entry.place); up !== entry.place && up.length >= entry.root.length; up = path.dirname(up)) {
      const above = atPlace.get(up);
      if (above) {
        held.add(entry.skill);
        if (!heldBy.has(above.skill)) heldBy.set(above.skill, []);
        heldBy.get(above.skill).push(entry);
        break;
      }
      if (path.dirname(up) === up) break;
    }
  }

  const nearestInside = (file) => (heldBy.get(indexed.get(file)?.skill) ?? [])
    .map(({ skill, place }) => ({ ...skill, path: path.join(place, path.basename(skill.path)) }));

  function tree() {
    const nodeOf = (entry, from) => ({
      skill: entry.skill,
      rel: path.relative(from, entry.place),
      children: (heldBy.get(entry.skill) ?? []).map((below) => nodeOf(below, entry.place)).sort(byRel),
    });
    const roots = [];
    for (const entry of listed) {
      if (held.has(entry.skill) || !heldBy.has(entry.skill)) continue;
      const last = roots.find((r) => r.root === entry.root) ?? roots[roots.push({ root: entry.root, nodes: [] }) - 1];
      last.nodes.push(nodeOf(entry, entry.root));
    }
    for (const root of roots) root.nodes.sort(byRel);
    return roots;
  }

  return { skills, nearestInside, tree };
}

const sourceAndName = (source, name) => JSON.stringify([source, name]);

function cachedSkill(file, source, cache, knownStat) {
  let stat = knownStat;
  try {
    stat ??= fs.statSync(file);
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

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byRel = (a, b) => compare(a.rel, b.rel);

function walkRealFolder(real, walk, logical) {
  if (walk.visited.has(real)) return [];
  walk.visited.add(real);
  let entries;
  try {
    entries = fs.readdirSync(real, { withFileTypes: true }).sort((a, b) => compare(a.name, b.name));
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (walk.entriesLeft-- <= 0) break;
    const entryPath = path.join(real, entry.name);
    const entryPlace = path.join(logical, entry.name);
    if (isServiceFolderName(entry.name) || walk.skipped.some((skipped) => samePath(skipped, entryPath))) continue;
    if (entry.isDirectory()) for (const skill of walkRealFolder(entryPath, walk, entryPlace)) found.push(skill);
    else if (entry.isSymbolicLink()) walk.links.push({ link: entryPath, place: entryPlace });
    else if (entry.name === SKILL_FILE && entry.isFile()) found.push({ file: entryPath, place: entryPlace });
  }
  return found;
}

const isServiceFolderName = (name) => name.startsWith('.') || name === 'node_modules';

function followLink(link, walk, place) {
  let stat;
  try {
    stat = fs.statSync(link);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return path.basename(link) === SKILL_FILE && stat.isFile() ? [{ file: link, stat, place }] : [];
  const target = existingRealPath(link);
  return target ? walkRealFolder(target, walk, place) : [];
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
  return {
    name: oneLine(text(data?.name)) || oneLine(path.basename(path.dirname(file))),
    description: text(data?.description) || firstLineOf(body),
    body,
    path: file,
    folder: path.dirname(file),
    source,
  };
}

module.exports = { buildIndex, readSkill, readSkillText };
