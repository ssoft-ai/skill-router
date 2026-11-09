'use strict';

function documentFrequency(documents, fields) {
  const frequency = new Map();
  for (const document of documents) {
    for (const token of new Set(fields.flatMap((f) => [...document[f].counts.keys()]))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  return frequency;
}

function corpusOf(documents, fieldCount, frequencyFieldSets) {
  const averageLengths = Array.from({ length: fieldCount }, (_, f) => documents.reduce((sum, d) => sum + d[f].length, 0) / Math.max(documents.length, 1));
  const documentFrequencies = frequencyFieldSets.map((fields) => documentFrequency(documents, fields));
  return { documents, averageLengths, documentFrequencies };
}

module.exports = { corpusOf };
