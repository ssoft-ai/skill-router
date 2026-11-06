'use strict';
// The stemmer of M. F. Porter, "An algorithm for suffix stripping", Program 14(3), 1980.

function isConsonant(word, i) {
  const c = word[i];
  if ('aeiou'.includes(c)) return false;
  if (c === 'y') return i === 0 || !isConsonant(word, i - 1);
  return true;
}

function measure(stemPart) {
  let m = 0;
  let i = 0;
  while (i < stemPart.length && isConsonant(stemPart, i)) i++;
  while (i < stemPart.length) {
    while (i < stemPart.length && !isConsonant(stemPart, i)) i++;
    if (i >= stemPart.length) break;
    while (i < stemPart.length && isConsonant(stemPart, i)) i++;
    m++;
  }
  return m;
}

const hasVowel = (stemPart) => [...stemPart].some((_, i) => !isConsonant(stemPart, i));

function endsWithDoubleConsonant(word) {
  const n = word.length;
  return n >= 2 && word[n - 1] === word[n - 2] && isConsonant(word, n - 1);
}

function endsConsonantVowelConsonant(word) {
  const n = word.length;
  return n >= 3 && isConsonant(word, n - 3) && !isConsonant(word, n - 2) && isConsonant(word, n - 1)
    && !'wxy'.includes(word[n - 1]);
}

function replaceSuffix(word, rules, condition) {
  for (const [suffix, replacement] of rules) {
    if (!word.endsWith(suffix)) continue;
    const stemPart = word.slice(0, -suffix.length);
    return condition(stemPart, suffix) ? stemPart + replacement : word;
  }
  return word;
}

function step1a(word) {
  return replaceSuffix(word, [['sses', 'ss'], ['ies', 'i'], ['ss', 'ss'], ['s', '']], () => true);
}

function step1b(word) {
  if (word.endsWith('eed')) return measure(word.slice(0, -3)) > 0 ? word.slice(0, -1) : word;
  const suffix = ['ed', 'ing'].find((s) => word.endsWith(s) && hasVowel(word.slice(0, -s.length)));
  if (!suffix) return word;
  const stemPart = word.slice(0, -suffix.length);
  if (['at', 'bl', 'iz'].some((s) => stemPart.endsWith(s))) return `${stemPart}e`;
  if (endsWithDoubleConsonant(stemPart) && !'lsz'.includes(stemPart.at(-1))) return stemPart.slice(0, -1);
  if (measure(stemPart) === 1 && endsConsonantVowelConsonant(stemPart)) return `${stemPart}e`;
  return stemPart;
}

function step1c(word) {
  return word.endsWith('y') && hasVowel(word.slice(0, -1)) ? `${word.slice(0, -1)}i` : word;
}

const STEP2 = [
  ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'], ['izer', 'ize'],
  ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'], ['ousli', 'ous'],
  ['ization', 'ize'], ['ation', 'ate'], ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'],
  ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble'],
];
const STEP3 = [
  ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', ''],
];
const STEP4 = [
  'ement', 'ance', 'ence', 'able', 'ible', 'ment', 'ant', 'ent', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize',
  'ion', 'al', 'er', 'ic', 'ou',
].map((suffix) => [suffix, '']);

function step4(word) {
  return replaceSuffix(word, STEP4, (stemPart, suffix) => measure(stemPart) > 1
    && (suffix !== 'ion' || /[st]$/.test(stemPart)));
}

function step5(word) {
  let result = word;
  if (result.endsWith('e')) {
    const stemPart = result.slice(0, -1);
    const m = measure(stemPart);
    if (m > 1 || (m === 1 && !endsConsonantVowelConsonant(stemPart))) result = stemPart;
  }
  if (measure(result) > 1 && result.endsWith('ll')) result = result.slice(0, -1);
  return result;
}

function stem(word) {
  if (word.length <= 2 || !/^[a-z]+$/.test(word)) return word;
  let result = step1c(step1b(step1a(word)));
  result = replaceSuffix(result, STEP2, (stemPart) => measure(stemPart) > 0);
  result = replaceSuffix(result, STEP3, (stemPart) => measure(stemPart) > 0);
  return step5(step4(result));
}

module.exports = { stem };
