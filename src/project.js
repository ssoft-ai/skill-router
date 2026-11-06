'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LIMIT = 20000;
const SKIPPED_FOLDERS = new Set(['.git', 'node_modules']);

function listProjectFiles(projectDir, { limit = DEFAULT_LIMIT } = {}) {
  const files = [];
  const pending = [''];
  while (pending.length > 0 && files.length < limit) {
    const relative = pending.shift();
    let entries;
    try {
      entries = fs.readdirSync(path.join(projectDir, relative), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIPPED_FOLDERS.has(entry.name)) pending.push(entryPath);
      } else if (files.length < limit) {
        files.push(entryPath);
      }
    }
  }
  return files;
}

module.exports = { listProjectFiles };
