# Changelog

All notable changes to skill-router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.0] - 2026-11-14

### Changed

- [search] Stopped searching pronouns such as `it`, `its` and `this` in a query
- [search] Named a found skill's folder by the shortest end of its path no other skill folder shares
- [router] Loaded a skill by the short folder a search names, refusing an end several skill folders share

### Fixed

- [search] Searched a query word sharing its stem with a preposition, such as `exception`, `one` or `likely`

## [0.2.0] - 2026-11-13

### Added

- [router] Added the MCP tools `search_skills` and `load_skill`, finding a skill at any folder depth
- [search] Ranked skills by the words of their name, description and instructions, matching PR to pull request
- [search] Returned the skills of one name as one result, with the folder and description of each
- [router] Listed the nested skills in the server instructions, up to `SKILL_ROUTER_INSTRUCTIONS_LIMIT`, and after a load
- [sources] Searched the user, project and plugin skills of Claude Code, its synced claude.ai skills, and Codex's
- [sources] Left out a project skill that a user skill of the same name hides, as Claude Code does
- [sources] Skipped dot folders, `node_modules` folders and a `SKILL.md` larger than 1 MiB
- [plugin] Added the `skill-router` plugin for Claude Code: skills listed by name, a search reminder, console notices
