'use strict';
const path = require('node:path');
const { parseSkillFile } = require('./frontmatter');
const { buildIndex, readSkillText } = require('./index');
const { existingRealPath, pathKey, samePath } = require('./paths');
const { search } = require('./search');

function createTools({ roots, home }) {
  const cache = new Map();
  const shortFolders = new WeakMap();
  let latest = null;
  const currentIndex = () => {
    latest = buildIndex(roots(), { cache });
    return latest;
  };
  const homePrefix = home ? `${path.resolve(home)}${path.sep}` : null;

  function shortFoldersOf(index) {
    if (!shortFolders.has(index)) shortFolders.set(index, fewestTrailingNames(index.skills.map((s) => s.folder)));
    return shortFolders.get(index);
  }

  const shortFolderIn = (index, folder) => shortFoldersOf(index).get(pathKey(folder)) ?? shownPath(folder);

  function shortFolder(folder) {
    return shortFolderIn(latest ?? currentIndex(), folder);
  }

  function skillByTrailingNames(index, requested) {
    const names = requested.split(/[\\/]+/).filter(Boolean);
    if (names.length === 0 || (names.length === 1 && pathKey(names[0]) === pathKey('SKILL.md'))) return undefined;
    const endsWithNames = (target) => pathKey(target).endsWith(pathKey(path.sep + names.join(path.sep)));
    const found = index.skills.filter((s) => endsWithNames(s.folder) || endsWithNames(s.path));
    if (found.length > 1) {
      const folders = found.map((s) => shortFolderIn(index, s.folder)).join(', ');
      throw new Error(`several installed skills are at this path: ${requested}; pass one of ${folders}`);
    }
    return found[0];
  }

  function shownPath(target) {
    return homePrefix && samePath(target.slice(0, homePrefix.length), homePrefix)
      ? `~${path.sep}${target.slice(homePrefix.length)}` : target;
  }

  function givenPath(shown) {
    return homePrefix && /^~[\\/]/.test(shown) ? path.join(homePrefix, shown.slice(2)) : shown;
  }

  function searchSkills({ query, limit }) {
    return search(currentIndex().skills, query, { limit });
  }

  function loadSkill({ path: requested }) {
    const relative = typeof requested === 'string' && requested !== '' && !path.isAbsolute(requested) && !/^~[\\/]/.test(requested);
    const spellings = indexedSpellings(typeof requested === 'string' ? givenPath(requested) : requested);
    const index = spellings.length > 0 || relative ? currentIndex() : { skills: [] };
    const skill = (relative && skillByTrailingNames(index, requested)) || index.skills
      .find((s) => spellings.some((spelling) => samePath(s.path, spelling) || samePath(s.folder, spelling)));
    const content = skill && readSkillText(skill.path);
    if (typeof content !== 'string') throw new Error(`no installed skill at this path: ${requested}`);
    return {
      folder: skill.folder,
      instructions: parseSkillFile(content).body.replace(/^﻿/, '').replace(/^\s*\n/, ''),
      inside: byName(index.nearestInside(skill.path)),
    };
  }

  const skillTree = () => currentIndex().tree();

  return { searchSkills, loadSkill, skillTree, shownPath, shortFolder };
}

function fewestTrailingNames(folders) {
  const namesOf = folders.map((folder) => folder.split(path.sep).filter(Boolean));
  const ending = (names, count) => pathKey(names.slice(-count).join(path.sep));
  const holders = new Map();
  for (const names of namesOf) {
    for (let count = 1; count <= names.length; count++) holders.set(ending(names, count), (holders.get(ending(names, count)) ?? 0) + 1);
  }
  const short = new Map();
  namesOf.forEach((names, i) => {
    for (let count = 1; count <= names.length; count++) {
      if (holders.get(ending(names, count)) === 1) {
        short.set(pathKey(folders[i]), names.slice(-count).join(path.sep));
        return;
      }
    }
  });
  return short;
}

function byName(found) {
  const groups = new Map();
  for (const { name, path: file, description } of found) {
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ path: file, description });
  }
  return [...groups].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, named]) => ({ name, skills: named }));
}

function indexedSpellings(requested) {
  if (typeof requested !== 'string' || requested === '') return [];
  const absolute = path.resolve(requested);
  const folder = existingRealPath(path.dirname(absolute));
  return [existingRealPath(absolute), folder && path.join(folder, path.basename(absolute))].filter(Boolean);
}

module.exports = { createTools, fewestTrailingNames };
