'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { parseSkillFile } = require('../src/frontmatter');

test('reads plain keys and the body after the frontmatter', () => {
  const parsed = parseSkillFile('---\nname: commit-rules\ndescription: Apply when writing commits\n---\n\n# Body\n');
  assert.deepStrictEqual(parsed.data, { name: 'commit-rules', description: 'Apply when writing commits' });
  assert.strictEqual(parsed.body, '\n# Body\n');
});

test('reads a plain value that starts on the line after its key', () => {
  const parsed = parseSkillFile('---\nname: a\ndescription:\n  Apply when the text\n  starts below\n---\n');
  assert.deepStrictEqual(parsed.data, { name: 'a', description: 'Apply when the text starts below' });
});

test('reads a quoted value that runs over several lines', () => {
  const parsed = parseSkillFile('---\ndescription: "Apply when\n  quoted text wraps"\nname: a\n---\n');
  assert.deepStrictEqual(parsed.data, { description: 'Apply when quoted text wraps', name: 'a' });
});

test('reads a file that starts with a byte order mark', () => {
  assert.deepStrictEqual(parseSkillFile('﻿---\nname: a\n---\n').data, { name: 'a' });
});

test('reads a file written with CRLF line ends', () => {
  const parsed = parseSkillFile('---\r\nname: a\r\nmetadata:\r\n  k: v\r\n---\r\nbody');
  assert.deepStrictEqual(parsed.data, { name: 'a', metadata: { k: 'v' } });
});

test('answers no data for a file without a closed frontmatter', () => {
  assert.strictEqual(parseSkillFile('# Title\n').data, null);
  assert.strictEqual(parseSkillFile('---\nname: a\n').data, null);
});

test('unquotes single- and double-quoted values and drops a trailing comment', () => {
  const parsed = parseSkillFile([
    '---',
    "name: 'it''s'",
    'description: "say \\"hi\\": now\\n"',
    'license: MIT # the licence',
    '---',
  ].join('\n'));
  assert.deepStrictEqual(parsed.data, { name: "it's", description: 'say "hi": now\n', license: 'MIT' });
});

test('reads an indented mapping under a key', () => {
  const parsed = parseSkillFile('---\nname: a\nmetadata:\n  level: process\n  paths: "src/**/*.cpp"\nlicense: MIT\n---\n');
  assert.deepStrictEqual(parsed.data, {
    name: 'a',
    metadata: { level: 'process', paths: 'src/**/*.cpp' },
    license: 'MIT',
  });
});

test('reads block and flow lists', () => {
  const parsed = parseSkillFile([
    '---',
    'metadata:',
    '  paths:',
    '    - "**/*.cpp"',
    '    - src/*.h',
    'tags:',
    '- a',
    'flow: [one, "two, three"]',
    '---',
  ].join('\n'));
  assert.deepStrictEqual(parsed.data, {
    metadata: { paths: ['**/*.cpp', 'src/*.h'] },
    tags: ['a'],
    flow: ['one', 'two, three'],
  });
});

test('folds and keeps block scalars by their indicators', () => {
  const parsed = parseSkillFile([
    '---',
    'folded: >',
    '  one',
    '  two',
    '',
    '  three',
    'stripped: >-',
    '  four',
    'literal: |',
    '  five',
    '  six',
    'plain: seven',
    '  eight',
    '---',
  ].join('\n'));
  assert.deepStrictEqual(parsed.data, {
    folded: 'one two\nthree\n',
    stripped: 'four',
    literal: 'five\nsix\n',
    plain: 'seven eight',
  });
});
