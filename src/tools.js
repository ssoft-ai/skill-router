'use strict';
const path = require('node:path');
const { parseSkillFile } = require('./frontmatter');
const { buildIndex, readSkillText } = require('./index');
const { existingRealPath, samePath } = require('./paths');
const { search } = require('./search');

function createTools({ roots, home }) {
  const cache = new Map();
  const currentIndex = () => buildIndex(roots(), { cache });
  const homePrefix = home ? `${path.resolve(home)}${path.sep}` : null;

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
    const spellings = indexedSpellings(typeof requested === 'string' ? givenPath(requested) : requested);
    const index = spellings.length > 0 ? currentIndex() : { skills: [] };
    const skill = index.skills
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

  return { searchSkills, loadSkill, skillTree, shownPath };
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

module.exports = { createTools };
