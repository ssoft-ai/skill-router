'use strict';
const path = require('node:path');
const { oneLine } = require('./one-line');

const NO_SKILL = 'No skill fits.';
const FOLDER_LABEL = 'Skill folder: ';
const INSIDE_LABEL = 'Narrower skills inside this one:';
const TREE_INTRO = 'Below is the tree of skills stored inside other skills\' folders. Each line is a folder inside the '
  + 'folder above it. To load a skill, pass load_skill the path down to its line, for example ';

function searchText(results, shown) {
  const text = results.flatMap(({ name, skills }) => {
    const byText = new Map();
    for (const skill of skills) {
      const description = oneLine(skill.description);
      const shared = byText.get(description) ?? { description, folders: [] };
      shared.folders.push(`  ${shown(path.dirname(skill.path))}`);
      byText.set(description, shared);
    }
    return [name, ...[...byText.values()].flatMap(({ description, folders }) => [...folders, `  ${description}`])];
  }).join('\n');
  return text || NO_SKILL;
}

function loadText({ folder, instructions, inside }, shown) {
  const text = `${FOLDER_LABEL}${shown(folder)}\n\n${instructions}`;
  return inside.length === 0 ? text : `${text.trimEnd()}\n\n${INSIDE_LABEL}\n${searchText(inside, shown)}`;
}

function instructionsText(base, roots, shown, limit = Infinity) {
  if (roots.length === 0) return base;
  const [{ root, nodes: [top] }] = roots;
  const head = `${base}\n\n${TREE_INTRO}${shown(path.join(root, top.rel, top.children[0].rel))}.\n\n`;
  let deepest = 1;
  for (const { nodes } of roots) for (const node of nodes) deepest = Math.max(deepest, depthOf(node));
  for (let depth = deepest; depth >= 1; depth--) {
    const text = head + treeLines(roots, shown, depth).join('\n');
    if (text.length <= limit) return text;
  }
  const end = 'search_skills finds the skills of the folders not shown.';
  const headers = new Set(roots.filter(({ nodes }) => !nodes.some((node) => node.rel === '')).map(({ root }) => shown(root)));
  const kept = [];
  let size = head.length + end.length;
  for (const line of treeLines(roots, shown, 1)) {
    if (size + line.length + 1 > limit) break;
    kept.push(line);
    size += line.length + 1;
  }
  while (kept.length > 0 && headers.has(kept.at(-1))) kept.pop();
  return head + [...kept, end].join('\n');
}

const depthOf = (node) => 1 + node.children.reduce((deepest, child) => Math.max(deepest, depthOf(child)), 0);

function treeLines(roots, shown, depth) {
  const lines = [];
  const add = (node, level, indent, folder) => {
    const name = node.skill.name === path.basename(folder) ? '' : ` (skill ${node.skill.name})`;
    const count = level < depth ? 0 : node.children.length;
    const cut = count > 0 ? ` (${count} more skill${count === 1 ? '' : 's'} inside; load it to list them)` : '';
    lines.push(`${'  '.repeat(indent)}${folder}${name}${cut}`);
    if (level < depth) for (const child of node.children) add(child, level + 1, indent + 1, child.rel);
  };
  for (const { root, nodes } of roots) {
    const rootSkill = nodes.find((node) => node.rel === '');
    if (rootSkill) add(rootSkill, 1, 0, shown(root));
    else lines.push(shown(root));
    for (const node of nodes.filter((n) => n !== rootSkill)) add(node, 1, 1, node.rel);
  }
  return lines;
}

function searchedNames(text) {
  if (text === NO_SKILL) return [];
  const lines = text.split('\n');
  return lines.some((line) => line.startsWith('  ')) ? lines.filter((line) => line && !line.startsWith(' ')) : null;
}

function loadedFolder(text) {
  const [first] = text.split('\n');
  return first.startsWith(FOLDER_LABEL) ? first.slice(FOLDER_LABEL.length) : null;
}

module.exports = { instructionsText, loadText, loadedFolder, searchText, searchedNames };
