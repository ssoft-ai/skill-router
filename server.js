#!/usr/bin/env node
'use strict';
const os = require('node:os');
const { serveStdio } = require('./src/mcp');
const { createRouter } = require('./src/router');

serveStdio(createRouter({
  folders: process.argv.slice(2),
  env: process.env,
  home: os.homedir(),
  cwd: process.cwd(),
}));
