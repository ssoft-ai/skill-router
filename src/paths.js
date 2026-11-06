'use strict';
const fs = require('node:fs');
const path = require('node:path');

function existingRealPath(p) {
  if (typeof p !== 'string' || p === '') return null;
  try {
    return fs.realpathSync.native(path.resolve(p));
  } catch {
    return null;
  }
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

module.exports = { existingRealPath, samePath };
