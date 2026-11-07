'use strict';
const { createMcpServer } = require('./mcp');
const { resolveRoots } = require('./sources');
const { createTools } = require('./tools');
const { version } = require('../package.json');

const MAX_LIMIT = 20;

const INSTRUCTIONS = 'This server finds the installed skills that fit a task, including skills the session\'s own '
  + 'skill list does not show. Before starting a task, call search_skills with the task in English words, read the '
  + 'descriptions it returns, call load_skill for each skill that fits, and follow it.';

const SEARCH_DEFINITION = {
  name: 'search_skills',
  description: 'Finds the installed skills that fit a task, among every skill source, best match first: each name '
    + 'once, with the path and description of every skill of that name, to pick from by description and place. '
    + 'Call it at the start of a task and whenever the task turns to new work.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The task in a few English words - what is to be done and with what. Write it in English even '
          + 'when the request is in another language.',
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, description: 'The most names to return; 10 when omitted.' },
    },
    required: ['query'],
  },
};

const LOAD_DEFINITION = {
  name: 'load_skill',
  description: 'Returns the instructions of a skill search_skills found - its SKILL.md - and the path of its '
    + 'folder, which the files the instructions name are read from.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'The path search_skills returned for the skill.' } },
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

function createRouter({ folders, env, home, cwd }) {
  const tools = createTools({ roots: () => resolveRoots({ folders, env, home, cwd }) });
  return createMcpServer({
    name: 'skill-router',
    version,
    instructions: INSTRUCTIONS,
    tools: [
      {
        definition: SEARCH_DEFINITION,
        handler: (args) => JSON.stringify(tools.searchSkills(validSearchArguments(args)), null, 1),
      },
      {
        definition: LOAD_DEFINITION,
        handler: (args) => {
          const { folder, content } = tools.loadSkill(args);
          return `Skill folder: ${folder}\n\n${content}`;
        },
      },
    ],
  });
}

module.exports = { createRouter };
