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
  { text: (skill) => skill.name, weight: 2 },
  { text: (skill) => skill.description, weight: 1 },
  { text: (skill) => skill.body ?? '', weight: 0.2 },
];

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
  const documentFrequency = new Map();
  for (const fields of documents) {
    for (const token of new Set(fields.flatMap((field) => [...field.counts.keys()]))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const queryTokens = [...new Set(tokenize(query))];
  const scored = skills.map((skill, n) => {
    let score = 0;
    for (const token of queryTokens) {
      const frequency = documents[n].reduce((sum, field, f) => {
        const count = field.counts.get(token) ?? 0;
        return count === 0 ? sum : sum + FIELDS[f].weight * count / (1 - B + B * field.length / averageLengths[f]);
      }, 0);
      if (frequency === 0) continue;
      const df = documentFrequency.get(token);
      const idf = Math.log(1 + (skills.length - df + 0.5) / (df + 0.5));
      score += idf * (frequency * (K1 + 1)) / (frequency + K1);
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
