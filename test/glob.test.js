'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { matchesGlob } = require('../src/glob');

const verdicts = (pattern, files) => files.map((file) => matchesGlob(pattern, file));

test('matches a pattern without a slash against the file name at any depth', () => {
  assert.deepStrictEqual(verdicts('*.cpp', ['main.cpp', 'src/a/main.cpp', 'main.cpp.bak']), [true, true, false]);
});

test('keeps a single star and a question mark inside one folder', () => {
  assert.deepStrictEqual(verdicts('src/*.h', ['src/a.h', 'src/x/a.h']), [true, false]);
  assert.deepStrictEqual(verdicts('src/?.h', ['src/a.h', 'src/ab.h']), [true, false]);
});

test('lets a double star cross any number of folders, none included', () => {
  assert.deepStrictEqual(verdicts('src/**/*.py', ['src/a.py', 'src/x/y/a.py', 'lib/a.py']), [true, true, false]);
  assert.deepStrictEqual(verdicts('docs/**', ['docs/a.md', 'docs/x/b.md', 'docsx/a.md']), [true, true, false]);
});

test('expands braces into alternatives', () => {
  assert.deepStrictEqual(verdicts('**/*.{h,hpp}', ['a/b.h', 'b.hpp', 'b.cpp']), [true, true, false]);
});

test('reads the alternatives inside braces as patterns', () => {
  assert.deepStrictEqual(verdicts('{*.h,*.cpp}', ['a.h', 'src/b.cpp', 'c.py']), [true, true, false]);
});

test('reads a leading ./ or / as the project root', () => {
  assert.deepStrictEqual(verdicts('./CMakeLists.txt', ['CMakeLists.txt', 'sub/CMakeLists.txt']), [true, false]);
  assert.deepStrictEqual(verdicts('/CMakeLists.txt', ['CMakeLists.txt', 'sub/CMakeLists.txt']), [true, false]);
});

test('treats regular expression characters in a pattern literally', () => {
  assert.deepStrictEqual(verdicts('a+b(1).txt', ['a+b(1).txt', 'aab1.txt']), [true, false]);
});
