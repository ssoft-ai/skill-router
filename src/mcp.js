'use strict';
const readline = require('node:readline');

const SUPPORTED_PROTOCOLS = ['2024-11-05', '2025-06-18'];
const LATEST_PROTOCOL = SUPPORTED_PROTOCOLS.at(-1);
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const PARSE_ERROR = -32700;

function createMcpServer({ name, version, instructions, tools }) {
  const byName = new Map(tools.map((tool) => [tool.definition.name, tool]));

  const methods = {
    initialize: (params) => ({
      protocolVersion: SUPPORTED_PROTOCOLS.includes(params?.protocolVersion) ? params.protocolVersion : LATEST_PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name, version },
      instructions,
    }),
    ping: () => ({}),
    'tools/list': () => ({ tools: tools.map((tool) => tool.definition) }),
    'tools/call': (params) => {
      const tool = byName.get(params?.name);
      if (!tool) throw rpcError(INVALID_PARAMS, `unknown tool: ${params?.name}`);
      try {
        return { content: [{ type: 'text', text: tool.handler(params.arguments ?? {}) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: error.message }], isError: true };
      }
    },
  };

  function handle(message) {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
      return errorResponse(null, rpcError(INVALID_REQUEST, 'invalid request'));
    }
    if (message.id === undefined) return null;
    const method = Object.hasOwn(methods, message.method) ? methods[message.method] : undefined;
    if (!method) return errorResponse(message.id, rpcError(METHOD_NOT_FOUND, `unknown method: ${message.method}`));
    try {
      return { jsonrpc: '2.0', id: message.id, result: method(message.params) };
    } catch (error) {
      return errorResponse(message.id, error);
    }
  }

  return { handle };
}

function rpcError(code, message) {
  return Object.assign(new Error(message), { code });
}

function errorResponse(id, error) {
  return { jsonrpc: '2.0', id, error: { code: error.code ?? -32603, message: error.message } };
}

function serveStdio(server, input = process.stdin, output = process.stdout) {
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  lines.on('line', (line) => {
    if (line.trim() === '') return;
    let response;
    try {
      response = server.handle(JSON.parse(line));
    } catch {
      response = errorResponse(null, rpcError(PARSE_ERROR, 'parse error'));
    }
    if (response) output.write(`${JSON.stringify(response)}\n`);
  });
}

module.exports = { createMcpServer, serveStdio };
