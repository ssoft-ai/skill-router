'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serverPath = path.join(__dirname, '..', 'server.js');
let dir;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-server-'));
  fs.mkdirSync(path.join(dir, 'skills', 'debugging'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'debugging', 'SKILL.md'), '---\nname: debugging\ndescription: Apply when a test fails\n---\n');
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('answers MCP requests over standard input and output, one JSON message per line', () => {
  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_skills', arguments: { query: 'test fails' } } },
  ];
  const run = spawnSync(process.execPath, [serverPath, path.join(dir, 'skills')], {
    input: requests.map((r) => JSON.stringify(r)).join('\n') + '\n',
    encoding: 'utf8',
    cwd: dir,
    timeout: 10000,
  });
  const responses = run.stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.deepStrictEqual(responses.map((r) => r.id), [1, 2]);
  assert.strictEqual(responses[1].result.content[0].text.split('\n')[0], 'debugging');
});
