'use strict';
const path = require('node:path');
const { buildIndex, readSkillText } = require('./index');
const { existingRealPath, samePath } = require('./paths');
const { listProjectFiles } = require('./project');
const { search } = require('./search');

function createTools({ roots, projectDir }) {
  const cache = new Map();
  const currentIndex = () => buildIndex(roots(), { cache });

  function searchSkills({ query, limit }) {
    return search(currentIndex().skills, query, { limit, projectFiles: () => listProjectFiles(projectDir) });
  }

  function loadSkill({ path: requested }) {
    const spellings = indexedSpellings(requested);
    const skill = spellings.length > 0 && currentIndex().skills
      .find((s) => spellings.some((spelling) => samePath(s.path, spelling) || samePath(s.folder, spelling)));
    const content = skill && readSkillText(skill.path);
    if (typeof content !== 'string') throw new Error(`not a skill of the index: ${requested}`);
    return { folder: skill.folder, content };
  }

  return { searchSkills, loadSkill };
}

function indexedSpellings(requested) {
  if (typeof requested !== 'string' || requested === '') return [];
  const absolute = path.resolve(requested);
  const folder = existingRealPath(path.dirname(absolute));
  return [existingRealPath(absolute), folder && path.join(folder, path.basename(absolute))].filter(Boolean);
}

module.exports = { createTools };
