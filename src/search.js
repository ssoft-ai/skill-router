'use strict';
const { matchesGlob } = require('./glob');
const { stem } = require('./stem');

const DEFAULT_LIMIT = 10;
const K1 = 1.2;
const B = 0.75;
const PATHS_MATCH_BOOST = 1.5;

function pathPatterns(metadata) {
  const paths = metadata?.paths;
  const list = Array.isArray(paths) ? paths : String(paths ?? '').split(',');
  return list.map((p) => String(p).trim()).filter(Boolean);
}

function pathsMatchProject(skill, projectFiles) {
  const patterns = pathPatterns(skill.metadata);
  return patterns.some((pattern) => projectFiles.some((file) => matchesGlob(pattern, file)));
}

function tokenize(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map(stem);
}

const FIELDS = [
  { text: (skill) => skill.name, weight: 2, lengthNormalisation: 0 },
  { text: (skill) => skill.description, weight: 1, lengthNormalisation: B, maxLengthFactor: 2 },
  { text: (skill) => skill.body ?? '', weight: 0.25, lengthNormalisation: B },
];
const [NAME, DESCRIPTION, INSTRUCTIONS] = FIELDS.keys();

const SCORE_PARTS = [
  { fields: [NAME, DESCRIPTION], documentFrequencyOver: [NAME, DESCRIPTION] },
  { fields: [INSTRUCTIONS], documentFrequencyOver: [NAME, DESCRIPTION, INSTRUCTIONS] },
];

const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'yet', 'if', 'than', 'because', 'while', 'whether',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'as', 'at', 'before', 'behind',
  'below', 'beneath', 'beside', 'between', 'beyond', 'by', 'despite', 'down', 'during', 'except', 'for',
  'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over', 'per',
  'since', 'through', 'throughout', 'till', 'to', 'toward', 'towards', 'under', 'until', 'up', 'upon', 'via',
  'with', 'within', 'without',
].map(stem));

function matchWeight(field, { weight, lengthNormalisation, maxLengthFactor = Infinity }, averageLength, token) {
  if (!field.counts.has(token)) return 0;
  const lengthFactor = 1 - lengthNormalisation + lengthNormalisation * field.length / averageLength;
  return weight / Math.min(maxLengthFactor, Math.max(1, lengthFactor));
}

function documentFrequency(documents, fields) {
  const frequency = new Map();
  for (const document of documents) {
    for (const token of new Set(fields.flatMap((f) => [...document[f].counts.keys()]))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  return frequency;
}

function fieldCounts(text) {
  const tokens = tokenize(text);
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return { counts, length: tokens.length };
}

const documentCache = new WeakMap();

function documentOf(skill) {
  if (!documentCache.has(skill)) documentCache.set(skill, FIELDS.map((field) => fieldCounts(field.text(skill))));
  return documentCache.get(skill);
}

function search(skills, query, { limit = DEFAULT_LIMIT, projectFiles: filesOrLister = [] } = {}) {
  const anyPaths = skills.some((skill) => pathPatterns(skill.metadata).length > 0);
  const projectFiles = !anyPaths ? [] : typeof filesOrLister === 'function' ? filesOrLister() : filesOrLister;
  const documents = skills.map(documentOf);
  const averageLengths = FIELDS.map((_, f) => documents.reduce((sum, d) => sum + d[f].length, 0) / Math.max(documents.length, 1));
  const frequencies = SCORE_PARTS.map((part) => documentFrequency(documents, part.documentFrequencyOver));
  const queryTokens = [...new Set(tokenize(query))].filter((token) => !FUNCTION_WORDS.has(token));
  const scored = skills.map((skill, n) => {
    let score = 0;
    for (const token of queryTokens) {
      SCORE_PARTS.forEach((part, p) => {
        const frequency = part.fields.reduce((sum, f) => sum + matchWeight(documents[n][f], FIELDS[f], averageLengths[f], token), 0);
        if (frequency === 0) return;
        const df = frequencies[p].get(token);
        const idf = Math.log(1 + (skills.length - df + 0.5) / (df + 0.5));
        score += idf * (frequency * (K1 + 1)) / (frequency + K1);
      });
    }
    if (score > 0 && pathsMatchProject(skill, projectFiles)) score *= PATHS_MATCH_BOOST;
    return { skill, score };
  });
  const results = new Map();
  for (const { skill } of scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)) {
    const key = JSON.stringify([skill.name, skill.description]);
    const same = results.get(key);
    if (same) same.otherPaths = [...(same.otherPaths ?? []), skill.path];
    else results.set(key, { name: skill.name, path: skill.path, description: skill.description });
  }
  return [...results.values()].slice(0, limit);
}

module.exports = { search };
