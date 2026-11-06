'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listProjectFiles } = require('../src/project');

let dir;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-project-'));
  for (const file of ['CMakeLists.txt', 'src/main.cpp', 'src/x/y.h', '.git/HEAD', 'node_modules/a/index.js']) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), '');
  }
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('lists the project files by forward-slash paths from its root, leaving out .git and node_modules', () => {
  assert.deepStrictEqual(listProjectFiles(dir).sort(), ['CMakeLists.txt', 'src/main.cpp', 'src/x/y.h']);
});

test('stops at the stated number of files', () => {
  assert.strictEqual(listProjectFiles(dir, { limit: 2 }).length, 2);
});

test('lists nothing for a folder that does not exist', () => {
  assert.deepStrictEqual(listProjectFiles(path.join(dir, 'missing')), []);
});
