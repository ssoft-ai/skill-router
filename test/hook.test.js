'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const hookPath = path.join(__dirname, '..', 'hooks', 'search-reminder.js');
const run = (input) => spawnSync(process.execPath, [hookPath], { input, encoding: 'utf8' });

test('adds context naming the search and load tools to a prompt', () => {
  const result = run(JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'Write a test' }));
  const output = JSON.parse(result.stdout);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(output.hookSpecificOutput.additionalContext, /search_skills[\s\S]*load_skill/);
});

test('answers after reading a prompt larger than a pipe buffer', () => {
  const result = run(JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'x'.repeat(2 * 1024 * 1024) }));
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.error, undefined);
  assert.ok(JSON.parse(result.stdout).hookSpecificOutput);
});
