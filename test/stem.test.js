'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { stem } = require('../src/stem');

test('reduces English words to the stems of the Porter algorithm', () => {
  const expected = {
    caresses: 'caress', ponies: 'poni', cats: 'cat', agreed: 'agre', plastered: 'plaster',
    motoring: 'motor', sing: 'sing', hopping: 'hop', falling: 'fall', filing: 'file',
    happy: 'happi', relational: 'relat', conditional: 'condit', generalization: 'gener',
    hopefulness: 'hope', goodness: 'good', adjustment: 'adjust', effective: 'effect',
    controlling: 'control', rate: 'rate',
  };
  const actual = Object.fromEntries(Object.keys(expected).map((word) => [word, stem(word)]));
  assert.deepStrictEqual(actual, expected);
});

test('leaves a word of two letters, a word beyond the English letters and a symbol as it is', () => {
  const words = ['is', 'prüfungen', 'versión', 'выпуски', '测试', 'c++'];
  assert.deepStrictEqual(words.map(stem), words);
});
