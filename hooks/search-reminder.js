#!/usr/bin/env node
'use strict';

const REMINDER = 'Before any other tool, call search_skills with the task in a few English words, whatever the '
  + 'request\'s language; then load_skill for each result that fits, before reading the project, and follow it.';

process.stdin.resume();
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: REMINDER },
  }));
});
