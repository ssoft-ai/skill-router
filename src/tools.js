'use strict';
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
    const target = existingRealPath(requested);
    const skill = target && currentIndex().skills.find((s) => samePath(s.path, target) || samePath(s.folder, target));
    const content = skill && readSkillText(skill.path);
    if (typeof content !== 'string') throw new Error(`not a skill of the index: ${requested}`);
    return { folder: skill.folder, content };
  }

  return { searchSkills, loadSkill };
}

module.exports = { createTools };
