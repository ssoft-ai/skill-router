'use strict';
const { ABBREVIATIONS } = require('./abbreviations');
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

const ABBREVIATION_MARK = '#';

function wordsOf(text) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

const pluralOf = (word) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);

function tableOf(abbreviations) {
  const fullForms = new Map();
  const abbreviationTerms = new Map();
  const longestFirst = (forms) => forms.sort((a, b) => b.words.length - a.words.length);
  const listUnder = (word, form) => fullForms.set(word, longestFirst([...(fullForms.get(word) ?? []), form]));
  for (const { short, full } of abbreviations) {
    const term = ABBREVIATION_MARK + short[0];
    for (const form of short) abbreviationTerms.set(form, term);
    for (const text of full) {
      const words = wordsOf(text);
      const form = { words, plural: pluralOf(words.at(-1)), term };
      listUnder(words[0], form);
      if (words.length === 1) listUnder(form.plural, form);
    }
  }
  return { fullForms, abbreviationTerms };
}

function writesFullForm(words, i, form) {
  const last = form.words.length - 1;
  return form.words.every((expected, k) => words[i + k] === expected || (k === last && words[i + k] === form.plural));
}

function abbreviationAt(words, i, table) {
  const form = table.fullForms.get(words[i])?.find((candidate) => writesFullForm(words, i, candidate));
  if (form) return { term: form.term, start: i, length: form.words.length };
  const term = table.abbreviationTerms.get(words[i]);
  return term && { term, start: i, length: 1 };
}

function abbreviationsIn(words, table) {
  const found = [];
  for (let i = 0; i < words.length;) {
    const abbreviation = abbreviationAt(words, i, table);
    if (abbreviation) found.push(abbreviation);
    i += abbreviation?.length ?? 1;
  }
  return found;
}

function fieldCounts(text, table) {
  const words = wordsOf(text);
  const terms = [...words.map(stem), ...abbreviationsIn(words, table).map((abbreviation) => abbreviation.term)];
  const counts = new Map();
  for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
  return { counts, length: words.length };
}

function queryTerms(query, table) {
  const words = wordsOf(query);
  const terms = [];
  let next = 0;
  for (const { term, start, length } of abbreviationsIn(words, table)) {
    terms.push(...words.slice(next, start).map(stem), term);
    next = start + length;
  }
  terms.push(...words.slice(next).map(stem));
  return [...new Set(terms)].filter((term) => !FUNCTION_WORDS.has(term));
}

const caches = new WeakMap();

function cacheFor(abbreviations) {
  if (!caches.has(abbreviations)) caches.set(abbreviations, { table: tableOf(abbreviations), documents: new WeakMap() });
  return caches.get(abbreviations);
}

function documentOf(skill, { table, documents }) {
  if (!documents.has(skill)) documents.set(skill, FIELDS.map((field) => fieldCounts(field.text(skill), table)));
  return documents.get(skill);
}

function search(skills, query, { limit = DEFAULT_LIMIT, projectFiles: filesOrLister = [], abbreviations = ABBREVIATIONS } = {}) {
  const anyPaths = skills.some((skill) => pathPatterns(skill.metadata).length > 0);
  const projectFiles = !anyPaths ? [] : typeof filesOrLister === 'function' ? filesOrLister() : filesOrLister;
  const cache = cacheFor(abbreviations);
  const documents = skills.map((skill) => documentOf(skill, cache));
  const averageLengths = FIELDS.map((_, f) => documents.reduce((sum, d) => sum + d[f].length, 0) / Math.max(documents.length, 1));
  const frequencies = SCORE_PARTS.map((part) => documentFrequency(documents, part.documentFrequencyOver));
  const queryTokens = queryTerms(query, cache.table);
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
  const byName = new Map();
  for (const { skill, score } of scored) {
    const listed = { path: skill.path, description: skill.description };
    const result = byName.get(skill.name);
    if (result) {
      result.skills.push(listed);
      result.score = Math.max(result.score, score);
    } else {
      byName.set(skill.name, { name: skill.name, skills: [listed], score });
    }
  }
  return [...byName.values()].filter((result) => result.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
    .map(({ name, skills: listed }) => ({ name, skills: listed }));
}

module.exports = { search };
