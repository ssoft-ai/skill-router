'use strict';
const { createMcpServer } = require('./mcp');
const { resolveRoots } = require('./sources');
const { instructionsText, loadText, searchText } = require('./texts');
const { createTools } = require('./tools');
const { version } = require('../package.json');

const MAX_LIMIT = 20;

const INSTRUCTIONS = 'Before you read the project, call search_skills to find the installed skills for the task. The '
  + 'search compares words, not meaning. For each result that fits the task, call load_skill with its folder and follow '
  + 'the instructions it returns.';

const SEARCH_DEFINITION = {
  name: 'search_skills',
  description: 'Call this tool when a task starts or changes, with the task in a few English words. It returns the '
    + 'installed skills whose name, description or instructions share the most words with the query, best match first, '
    + 'each with its folder and description.',
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
  description: 'Returns a found skill\'s instructions, its folder, which the files they name are read from, and '
    + 'the skills stored inside that folder.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'A folder search_skills or load_skill returned.' } },
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

function instructionsWithTree(tools, limit) {
  try {
    return instructionsText(INSTRUCTIONS, tools.skillTree(), tools.shownPath, limit);
  } catch (error) {
    process.stderr.write(`skill-router: the instructions go without the tree of nested skills: ${error.message}\n`);
    return INSTRUCTIONS;
  }
}

function createRouter({ folders, env, home, cwd }) {
  const tools = createTools({ roots: () => resolveRoots({ folders, env, home, cwd }), home });
  return createMcpServer({
    name: 'skill-router',
    version,
    instructions: instructionsWithTree(tools, Number(env.SKILL_ROUTER_INSTRUCTIONS_LIMIT) || undefined),
    tools: [
      {
        definition: SEARCH_DEFINITION,
        handler: (args) => searchText(tools.searchSkills(validSearchArguments(args)), tools.shownPath),
      },
      {
        definition: LOAD_DEFINITION,
        handler: (args) => loadText(tools.loadSkill(args), tools.shownPath),
      },
    ],
  });
}

module.exports = { createRouter };
