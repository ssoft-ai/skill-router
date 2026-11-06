'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createMcpServer } = require('../src/mcp');

const echo = {
  definition: { name: 'echo', description: 'Echoes', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
  handler: ({ text }) => {
    if (text === 'fail') throw new Error('asked to fail');
    return `echo: ${text}`;
  },
};
const server = createMcpServer({ name: 'test-server', version: '1.2.3', instructions: 'Use echo.', tools: [echo] });

test('answers initialize with the requested protocol version, the tools capability and the instructions', () => {
  const response = server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'c', version: '0' } } });
  assert.deepStrictEqual(response, {
    jsonrpc: '2.0',
    id: 1,
    result: {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'test-server', version: '1.2.3' },
      instructions: 'Use echo.',
    },
  });
});

test('offers its own latest protocol version for a version it does not support', () => {
  const offered = ['1999-01-01', '2025-03-26'].map((protocolVersion) => (
    server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion } }).result.protocolVersion));
  assert.deepStrictEqual(offered, ['2025-06-18', '2025-06-18']);
});

test('answers a message that is not a request object with Invalid Request', () => {
  assert.deepStrictEqual([null, [], 'text'].map((message) => server.handle(message).error.code), [-32600, -32600, -32600]);
});

test('answers no notification', () => {
  assert.strictEqual(server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

test('answers ping with an empty result', () => {
  assert.deepStrictEqual(server.handle({ jsonrpc: '2.0', id: 'p', method: 'ping' }), { jsonrpc: '2.0', id: 'p', result: {} });
});

test('lists the tool definitions', () => {
  assert.deepStrictEqual(server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' }).result, { tools: [echo.definition] });
});

test('returns the text a tool answers as its content', () => {
  const response = server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'echo', arguments: { text: 'hi' } } });
  assert.deepStrictEqual(response.result, { content: [{ type: 'text', text: 'echo: hi' }] });
});

test('returns a failing tool as an error result carrying its message', () => {
  const response = server.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'echo', arguments: { text: 'fail' } } });
  assert.deepStrictEqual(response.result, { content: [{ type: 'text', text: 'asked to fail' }], isError: true });
});

test('rejects an unknown tool and an unknown method with their JSON-RPC errors', () => {
  const tool = server.handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope', arguments: {} } });
  const method = server.handle({ jsonrpc: '2.0', id: 6, method: 'resources/list' });
  assert.deepStrictEqual([tool.error.code, method.error.code], [-32602, -32601]);
});

test('rejects a method named after an inherited property as unknown', () => {
  const codes = ['toString', 'constructor', '__proto__'].map((method) => server.handle({ jsonrpc: '2.0', id: 7, method }).error?.code);
  assert.deepStrictEqual(codes, [-32601, -32601, -32601]);
});
