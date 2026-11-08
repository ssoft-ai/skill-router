'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { settleListing } = require('../src/listing');

let dir;
before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-router-listing-')); });
after(() => fs.rmSync(dir, { recursive: true, force: true }));

let cases = 0;
function setup(settings) {
  const folder = path.join(dir, String(++cases));
  fs.mkdirSync(folder, { recursive: true });
  const settingsFile = path.join(folder, 'settings.json');
  if (settings !== undefined) fs.writeFileSync(settingsFile, typeof settings === 'string' ? settings : JSON.stringify(settings, null, 2));
  return { settingsFile, stateFile: path.join(folder, 'state', 'listing.json'), otherSettingsFiles: [path.join(folder, 'project.json')] };
}
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('shortens every description of the listing once the mode is on', () => {
  const files = setup({ model: 'opus' });
  settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual(read(files.settingsFile), { model: 'opus', skillListingMaxDescChars: 1 });
});

test('creates the settings file the mode needs when there is none', () => {
  const files = setup();
  settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual(read(files.settingsFile), { skillListingMaxDescChars: 1 });
});

test('changes no file when the listing already is as the mode sets it', () => {
  const files = setup({ model: 'opus' });
  settleListing({ ...files, namesOnly: true });
  const before = [fs.statSync(files.settingsFile).mtimeMs, fs.statSync(files.stateFile).mtimeMs];
  const outcome = settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual([outcome, fs.statSync(files.settingsFile).mtimeMs, fs.statSync(files.stateFile).mtimeMs], ['unchanged', ...before]);
});

test('restores the listing as it was once the mode is off', () => {
  const files = setup({ model: 'opus' });
  settleListing({ ...files, namesOnly: true });
  settleListing({ ...files, namesOnly: false });
  assert.deepStrictEqual(read(files.settingsFile), { model: 'opus' });
});

test('changes no file when the mode is off and it never set the listing', () => {
  const files = setup({ model: 'opus' });
  const text = fs.readFileSync(files.settingsFile, 'utf8');
  const outcome = settleListing({ ...files, namesOnly: false });
  assert.deepStrictEqual([outcome, fs.readFileSync(files.settingsFile, 'utf8'), fs.existsSync(files.stateFile)], ['unchanged', text, false]);
});

test("keeps a description length the user set, whether the mode is on or off", () => {
  const files = setup({ skillListingMaxDescChars: 300 });
  const outcomes = [true, false].map((namesOnly) => settleListing({ ...files, namesOnly }));
  assert.deepStrictEqual([outcomes, read(files.settingsFile)], [['user', 'user'], { skillListingMaxDescChars: 300 }]);
});

test('removes the settings file and the folders it created once the mode is off', () => {
  const files = setup();
  const settingsFile = path.join(path.dirname(files.settingsFile), 'created', '.claude', 'settings.local.json');
  settleListing({ ...files, settingsFile, namesOnly: true });
  settleListing({ ...files, settingsFile, namesOnly: false });
  assert.deepStrictEqual([fs.existsSync(path.dirname(path.dirname(settingsFile))), fs.existsSync(path.dirname(files.settingsFile))], [false, true]);
});

test('keeps a settings file it created once another key was written to it, and the folder holding another file', () => {
  const files = setup();
  const created = path.join(path.dirname(files.settingsFile), 'shared', '.claude');
  const settingsFile = path.join(created, 'settings.local.json');
  const otherFile = path.join(path.dirname(files.settingsFile), 'other', '.claude', 'settings.local.json');
  const other = { ...files, settingsFile: otherFile, stateFile: `${files.stateFile}.other` };
  settleListing({ ...files, settingsFile, namesOnly: true });
  settleListing({ ...other, namesOnly: true });
  fs.writeFileSync(settingsFile, JSON.stringify({ ...read(settingsFile), model: 'opus' }));
  fs.writeFileSync(path.join(path.dirname(otherFile), 'notes.md'), 'kept');
  settleListing({ ...files, settingsFile, namesOnly: false });
  settleListing({ ...other, namesOnly: false });
  assert.deepStrictEqual([read(settingsFile), fs.existsSync(otherFile), fs.existsSync(path.dirname(otherFile))], [{ model: 'opus' }, false, true]);
});

test('removes the folder of its records once the last record in it is gone, and keeps it while another record is there', () => {
  const files = setup({ model: 'opus' });
  const other = { ...setup({ model: 'opus' }), stateFile: path.join(path.dirname(files.stateFile), 'other.json') };
  settleListing({ ...files, namesOnly: true });
  settleListing({ ...other, namesOnly: true });
  settleListing({ ...files, namesOnly: false });
  const keptWhileAnother = fs.existsSync(path.dirname(files.stateFile));
  settleListing({ ...other, namesOnly: false });
  assert.deepStrictEqual([keptWhileAnother, fs.existsSync(path.dirname(files.stateFile))], [true, false]);
});

test('writes its record of the value before the value, so a stop between the two leaves no value it would take for the user\'s', (t) => {
  const files = setup({ model: 'opus' });
  const renameSync = fs.renameSync;
  const written = [];
  t.mock.method(fs, 'renameSync', (from, to) => {
    written.push(to);
    return renameSync(from, to);
  });
  settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual(written, [files.stateFile, files.settingsFile]);
});
test('keeps a listing budget the user set and adds no description length to it', () => {
  const files = setup({ skillListingBudgetFraction: 0.05 });
  settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual(read(files.settingsFile), { skillListingBudgetFraction: 0.05 });
});

test('adds no description length where a project settings file sets the listing', () => {
  const files = setup({ model: 'opus' });
  fs.writeFileSync(files.otherSettingsFiles[0], JSON.stringify({ skillListingMaxDescChars: 500 }));
  settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual(read(files.settingsFile), { model: 'opus' });
});

test('leaves the description length to the user once the user changed the value it set', () => {
  const files = setup({});
  settleListing({ ...files, namesOnly: true });
  fs.writeFileSync(files.settingsFile, JSON.stringify({ skillListingMaxDescChars: 80 }));
  settleListing({ ...files, namesOnly: false });
  assert.deepStrictEqual(read(files.settingsFile), { skillListingMaxDescChars: 80 });
});

test('keeps a value the user wrote after changing the one it set, even where the two are equal', () => {
  const files = setup({});
  settleListing({ ...files, namesOnly: true });
  fs.writeFileSync(files.settingsFile, JSON.stringify({ skillListingMaxDescChars: 80 }));
  settleListing({ ...files, namesOnly: true });
  fs.writeFileSync(files.settingsFile, JSON.stringify({ skillListingMaxDescChars: 1 }));
  settleListing({ ...files, namesOnly: false });
  assert.deepStrictEqual(read(files.settingsFile), { skillListingMaxDescChars: 1 });
});

test('changes no settings file it cannot read', () => {
  const files = setup();
  fs.mkdirSync(files.settingsFile);
  const outcome = settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual([outcome, fs.statSync(files.settingsFile).isDirectory()], ['unreadable', true]);
});

test('changes no settings file it cannot read as JSON', () => {
  const files = setup('{ "model": "opus", }');
  const outcome = settleListing({ ...files, namesOnly: true });
  assert.deepStrictEqual([outcome, fs.readFileSync(files.settingsFile, 'utf8')], ['unreadable', '{ "model": "opus", }']);
});

test('keeps the indentation of the settings file it changes', () => {
  const files = setup(JSON.stringify({ model: 'opus' }, null, 4));
  settleListing({ ...files, namesOnly: true });
  assert.strictEqual(fs.readFileSync(files.settingsFile, 'utf8'), '{\n    "model": "opus",\n    "skillListingMaxDescChars": 1\n}\n');
});
