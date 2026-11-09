#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT_NAME = 'skill-router-eval';
const MARKER = '.eval-root.json';
const BUILT_BY = 'scripts/build-eval-root.js';
const ROUTER_FILES = ['server.js', 'src', 'hooks', 'package.json', path.join('.claude-plugin', 'plugin.json')];

// The real path of `p`, resolved on its deepest existing prefix, so a link in the prefix cannot make one folder compare as two.
function realPath(p) {
  let existing = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(existing) && path.dirname(existing) !== existing) {
    rest.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }
  return path.join(fs.realpathSync.native(existing), ...rest);
}

function insideOf(dir, base) {
  const relative = path.relative(realPath(base), realPath(dir));
  if (relative === '') return true;
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) return false;
  return !path.isAbsolute(relative);
}

function metadataLines(metadata = {}) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '';
  const lines = entries.map(([key, value]) => (Array.isArray(value)
    ? `  ${key}:\n${value.map((item) => `    - ${JSON.stringify(item)}`).join('\n')}`
    : `  ${key}: ${JSON.stringify(value)}`));
  return `metadata:\n${lines.join('\n')}\n`;
}

function skillFile({ name, description, metadata }, instructions) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n${metadataLines(metadata)}---\n\n${instructions}`;
}

function build(repoDir, outDir) {
  if (insideOf(outDir, repoDir)) {
    throw new Error(`the output folder ${outDir} is inside the repository ${repoDir}: claude plugin eval would read its cases twice`);
  }
  const root = path.join(path.resolve(outDir), ROOT_NAME);
  if (fs.existsSync(root)) {
    let builtBy;
    try { builtBy = JSON.parse(fs.readFileSync(path.join(root, MARKER), 'utf8')).builtBy; } catch { builtBy = undefined; }
    if (builtBy !== BUILT_BY) throw new Error(`${root} exists and this script did not build it, so it is left in place`);
    fs.rmSync(root, { recursive: true, force: true });
  }
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, MARKER), `${JSON.stringify({ builtBy: BUILT_BY }, null, 2)}\n`);
  for (const file of ROUTER_FILES) fs.cpSync(path.join(repoDir, file), path.join(root, file), { recursive: true });
  fs.writeFileSync(path.join(root, '.mcp.json'), `${JSON.stringify({
    mcpServers: {
      'skill-router': {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/server.js', '${CLAUDE_PLUGIN_ROOT}/skills'],
        alwaysLoad: true,
      },
    },
  }, null, 2)}\n`);
  const catalog = path.join(repoDir, 'test', 'fixtures', 'catalog');
  const skills = JSON.parse(fs.readFileSync(path.join(catalog, 'skills.json'), 'utf8'));
  for (const skill of skills) {
    const file = path.join(root, 'skills', ...skill.path.split('/'));
    const instructions = fs.readFileSync(path.join(catalog, 'bodies', `${path.posix.dirname(skill.path)}.md`), 'utf8');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, skillFile(skill, instructions));
  }
  fs.cpSync(path.join(repoDir, 'evals'), path.join(root, 'evals'), { recursive: true });
  return root;
}

// node scripts/build-eval-root.js [output folder]
function main([outDir = os.tmpdir()]) {
  try {
    process.stdout.write(`${build(path.join(__dirname, '..'), outDir)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { build };
