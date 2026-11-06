'use strict';

const cache = new Map();

function globToRegExp(pattern) {
  const trimmed = pattern.trim();
  const anchored = trimmed.includes('/');
  const source = trimmed.replace(/^\.?\//, '');
  return new RegExp(`${anchored ? '^' : '^(?:.*/)?'}${translate(source)}$`);
}

function translate(source) {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (source.startsWith('**/', i)) {
      out += '(?:.*/)?';
      i += 2;
    } else if (source.startsWith('/**', i) && i + 3 === source.length) {
      out += '(?:/.*)?';
      i += 2;
    } else if (source.startsWith('**', i)) {
      out += '.*';
      i += 1;
    } else if (c === '*') {
      out += '[^/]*';
    } else if (c === '?') {
      out += '[^/]';
    } else if (c === '{' && source.indexOf('}', i) > i) {
      const close = source.indexOf('}', i);
      out += `(?:${source.slice(i + 1, close).split(',').map(translate).join('|')})`;
      i = close;
    } else {
      out += escape(c);
    }
  }
  return out;
}

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function matchesGlob(pattern, file) {
  if (!cache.has(pattern)) cache.set(pattern, globToRegExp(pattern));
  return cache.get(pattern).test(file);
}

module.exports = { matchesGlob };
