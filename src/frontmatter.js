'use strict';

const FENCE = '---';

function parseSkillFile(text) {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  if (lines[0] !== FENCE) return { data: null, body: text };
  const end = lines.indexOf(FENCE, 1);
  if (end < 0) return { data: null, body: text };
  const { value } = parseMapping(lines.slice(1, end), 0, 0);
  return { data: value, body: lines.slice(end + 1).join('\n') };
}

const KEY_LINE = /^([\w.-]+):(?:[ \t]+(.*))?$/;

const isBlank = (line) => /^\s*(#.*)?$/.test(line);
const indentOf = (line) => /^ */.exec(line)[0].length;

function nextContentLine(lines, i) {
  while (i < lines.length && isBlank(lines[i])) i++;
  return i;
}

function parseMapping(lines, i, indent) {
  const map = {};
  for (i = nextContentLine(lines, i); i < lines.length; i = nextContentLine(lines, i)) {
    const line = lines[i];
    if (indentOf(line) < indent) break;
    const match = KEY_LINE.exec(line.slice(indent));
    if (!match) {
      i++;
      continue;
    }
    const parsed = parseValue(lines, i + 1, indent, (match[2] ?? '').trim());
    map[match[1]] = parsed.value;
    i = parsed.next;
  }
  return { value: map, next: i };
}

function parseValue(lines, i, indent, inline) {
  if (inline.startsWith('[') && CLOSED_FLOW_LIST.test(inline)) return { value: flowList(inline), next: i };
  const blockIndicator = /^([|>])([+-]?)\s*(#.*)?$/.exec(inline);
  if (blockIndicator) {
    const block = takeIndented(lines, i, indent);
    return { value: blockScalar(block.lines, blockIndicator[1], blockIndicator[2]), next: block.next };
  }
  if (inline !== '') {
    const continuation = takeIndented(lines, i, indent);
    if (continuation.lines.length === 0 || CLOSED_QUOTE.test(inline)) return { value: scalar(inline), next: i };
    const joined = [inline, ...continuation.lines].map((part) => part.trim()).filter(Boolean).join(' ');
    return { value: /^['"]/.test(inline) ? scalar(joined) : joined.replace(/\s+#.*$/, ''), next: continuation.next };
  }
  const child = nextContentLine(lines, i);
  const childIndent = child < lines.length ? indentOf(lines[child]) : -1;
  if (childIndent >= indent && isListItem(lines[child])) return parseList(lines, child, childIndent);
  if (childIndent > indent && KEY_LINE.test(lines[child].slice(childIndent))) return parseMapping(lines, child, childIndent);
  if (childIndent > indent) return parseValue(lines, child + 1, indent, lines[child].trim());
  return { value: '', next: i };
}

const CLOSED_QUOTE = /^(?:'(?:[^']|'')*'|"(?:[^"\\]|\\.)*")/;
const CLOSED_FLOW_LIST = /\]\s*(?:#.*)?$/;

function takeIndented(lines, i, indent) {
  let last = i;
  for (let j = i; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    if (indentOf(lines[j]) <= indent) break;
    last = j + 1;
  }
  return { lines: lines.slice(i, last), next: last };
}

function blockScalar(raw, style, chomping) {
  const first = raw.find((line) => line.trim() !== '');
  const depth = first === undefined ? 0 : indentOf(first);
  const content = raw.map((line) => line.slice(depth));
  let text = style === '|' ? content.join('\n') : fold(content);
  text = text.replace(/\n*$/, '');
  if (chomping === '-' || text === '') return text;
  if (chomping === '+') return `${text}\n${'\n'.repeat(trailingBlankLines(raw))}`;
  return `${text}\n`;
}

function fold(content) {
  return content.reduce((text, line, n) => {
    if (n === 0) return line;
    if (line === '') return `${text}\n`;
    return text.endsWith('\n') || text === '' ? text + line : `${text} ${line}`;
  }, '');
}

function trailingBlankLines(raw) {
  let count = 0;
  for (let j = raw.length - 1; j >= 0 && raw[j].trim() === ''; j--) count++;
  return count;
}

const LIST_ITEM = /^ *- (.*)$/;
const isListItem = (line) => LIST_ITEM.test(line);

function parseList(lines, i, indent) {
  const list = [];
  for (i = nextContentLine(lines, i); i < lines.length; i = nextContentLine(lines, i)) {
    if (indentOf(lines[i]) !== indent || !isListItem(lines[i])) break;
    list.push(scalar(LIST_ITEM.exec(lines[i])[1]));
    i++;
  }
  return { value: list, next: i };
}

function flowList(text) {
  const items = [];
  const item = /\s*('(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[^,\]]*)\s*(,|\])/gy;
  item.lastIndex = 1;
  for (let match = item.exec(text); match; match = item.exec(text)) {
    if (match[1] !== '') items.push(scalar(match[1]));
    if (match[2] === ']') break;
  }
  return items;
}

const DOUBLE_ESCAPES = { n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/' };

function scalar(raw) {
  const text = raw.trim();
  if (text.startsWith("'")) return text.slice(1, text.lastIndexOf("'")).replace(/''/g, "'");
  if (text.startsWith('"')) {
    return text.slice(1, text.lastIndexOf('"')).replace(/\\(.)/g, (all, c) => DOUBLE_ESCAPES[c] ?? all);
  }
  return text.replace(/\s+#.*$/, '');
}

module.exports = { parseSkillFile };
