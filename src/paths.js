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

const pathKey = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

function samePath(a, b) {
  return pathKey(a) === pathKey(b);
}

module.exports = { existingRealPath, pathKey, samePath };
