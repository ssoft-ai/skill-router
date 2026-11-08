'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readJson } = require('./claude-settings');

const DESCRIPTION_LENGTH = 'skillListingMaxDescChars';
const LISTING_SETTINGS = [DESCRIPTION_LENGTH, 'skillListingBudgetFraction'];
const SHORT_DESCRIPTION_LENGTH = 1;

function settleListing({ settingsFile, otherSettingsFiles = [], stateFile, namesOnly, read = readJson }) {
  const settings = readSettings(settingsFile);
  if (!settings) return 'unreadable';
  const record = readJson(stateFile);
  if (record !== null && settings.data[DESCRIPTION_LENGTH] === record.value) {
    if (namesOnly) return 'unchanged';
    restore(settingsFile, settings, record);
    removeRecord(stateFile);
    return 'restored';
  }
  if (record !== null) removeRecord(stateFile);
  const userListing = [settings.data, ...otherSettingsFiles.map((file) => read(file) ?? {})]
    .some((data) => LISTING_SETTINGS.some((key) => data[key] !== undefined));
  if (userListing) return 'user';
  if (!namesOnly) return 'unchanged';
  const created = settings.exists ? undefined : highestMissing(settingsFile);
  writeSettings(stateFile, { data: { value: SHORT_DESCRIPTION_LENGTH, created } });
  settings.data[DESCRIPTION_LENGTH] = SHORT_DESCRIPTION_LENGTH;
  writeSettings(settingsFile, settings);
  return 'shortened';
}

function restore(settingsFile, settings, { created }) {
  delete settings.data[DESCRIPTION_LENGTH];
  if (created === undefined || Object.keys(settings.data).length > 0) {
    writeSettings(settingsFile, settings);
    return;
  }
  fs.rmSync(settingsFile, { force: true });
  for (let folder = path.dirname(settingsFile); folder.startsWith(created) && removeIfEmpty(folder); folder = path.dirname(folder));
}

function removeRecord(stateFile) {
  fs.rmSync(stateFile, { force: true });
  removeIfEmpty(path.dirname(stateFile));
}

function removeIfEmpty(folder) {
  try {
    fs.rmdirSync(folder);
    return true;
  } catch {
    return false;
  }
}

function highestMissing(file) {
  let missing = file;
  for (let folder = path.dirname(file); !fs.existsSync(folder); folder = path.dirname(folder)) missing = folder;
  return missing;
}

function readSettings(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return error.code === 'ENOENT' ? { data: {}, exists: false } : null;
  }
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return { data, indent: /\n([ \t]+)"/.exec(text)?.[1], exists: true };
  } catch {
    return null;
  }
}

function writeSettings(file, { data, indent = 2 }) {
  const temporary = `${file}.${process.pid}.tmp`;
  const text = `${JSON.stringify(data, null, indent)}\n`;
  try {
    fs.writeFileSync(temporary, text);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temporary, text);
  }
  fs.renameSync(temporary, file);
}

module.exports = { settleListing };
