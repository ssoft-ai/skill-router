'use strict';
const path = require('node:path');
const { createMcpServer } = require('./mcp');
const { resolveRoots } = require('./sources');
const { createTools } = require('./tools');
const { version } = require('../package.json');

const MAX_LIMIT = 20;

const INSTRUCTIONS = 'Finds the installed skills that fit a task, including those the session\'s skill list does not '
  + 'show: call search_skills first, then load_skill for each skill that fits, and follow it.';

const SEARCH_DEFINITION = {
  name: 'search_skills',
  description: 'Finds the installed skills that fit a task, best first: under each name, the folder and description '
    + 'of every skill of that name, to pick from by description and place. Call it when a task starts or turns to '
    + 'new work.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The task in a few English words, even for a request in another language: what is done to what, '
          + 'naming the language and the kind of file, as a task on the tests of a Python module names "Python" and '
          + '"test".',
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, description: 'The most names to return; 10 when omitted.' },
    },
    required: ['query'],
  },
};

const LOAD_DEFINITION = {
  name: 'load_skill',
  description: 'Returns the instructions of a skill search_skills found, and its folder, which the files they name '
    + 'are read from.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'A folder search_skills returned.' } },
    required: ['path'],
  },
};

function validSearchArguments({ query, limit }) {
  if (typeof query !== 'string' || query.trim() === '') throw new Error('query must name the task in words');
  if (limit !== undefined && !(Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT)) {
    throw new Error(`limit must be a whole number from 1 to ${MAX_LIMIT}`);
  }
  return { query, limit };
}

const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

function searchText(results, shown) {
  return results.flatMap(({ name, skills }) => {
    const byDescription = new Map();
    for (const skill of skills) {
      const description = oneLine(skill.description);
      const folders = byDescription.get(description) ?? [];
      byDescription.set(description, [...folders, `  ${shown(path.dirname(skill.path))}`]);
    }
    return [oneLine(name), ...[...byDescription].flatMap(([description, folders]) => [...folders, `  ${description}`])];
  }).join('\n');
}

const NO_SKILL = 'No skill fits.';
const FOLDER_LABEL = 'Skill folder: ';

function searchedNames(text) {
  if (text === NO_SKILL) return [];
  const lines = text.split('\n');
  return lines.some((line) => line.startsWith('  ')) ? lines.filter((line) => line && !line.startsWith(' ')) : null;
}

function loadedFolder(text) {
  const [first] = text.split('\n');
  return first.startsWith(FOLDER_LABEL) ? first.slice(FOLDER_LABEL.length) : null;
}

function createRouter({ folders, env, home, cwd }) {
  const tools = createTools({ roots: () => resolveRoots({ folders, env, home, cwd }), home });
  return createMcpServer({
    name: 'skill-router',
    version,
    instructions: INSTRUCTIONS,
    tools: [
      {
        definition: SEARCH_DEFINITION,
        handler: (args) => searchText(tools.searchSkills(validSearchArguments(args)), tools.shownPath) || NO_SKILL,
      },
      {
        definition: LOAD_DEFINITION,
        handler: (args) => {
          const { folder, instructions } = tools.loadSkill(args);
          return `${FOLDER_LABEL}${tools.shownPath(folder)}\n\n${instructions}`;
        },
      },
    ],
  });
}

module.exports = { createRouter, loadedFolder, searchedNames };
