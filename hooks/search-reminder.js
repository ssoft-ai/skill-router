#!/usr/bin/env node
'use strict';

const REMINDER = 'Before any other tool, call search_skills with the task in a few English words, even when the '
  + 'request is in another language. Then call load_skill for every result whose description fits the task, '
  + 'before reading the project or deciding the task cannot be done, and follow the skills loaded.';

process.stdin.resume();
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: REMINDER },
  }));
});
