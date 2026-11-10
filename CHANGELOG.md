# Changelog

All notable changes to skill-router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- [router] Added the MCP tools `search_skills` and `load_skill`, finding a skill at any folder depth
- [search] Ranked skills by the words of their name, description and instructions, matching PR to pull request
- [search] Returned the skills of one name as one result, with the folder and description of each
- [router] Listed the nested skills in the server instructions, up to `SKILL_ROUTER_INSTRUCTIONS_LIMIT`, and after a load
- [sources] Searched the user, project and plugin skills of Claude Code, its synced claude.ai skills, and Codex's
- [sources] Left out a project skill that a user skill of the same name hides, as Claude Code does
- [sources] Skipped dot folders, `node_modules` folders and a `SKILL.md` larger than 1 MiB
- [plugin] Added the `skill-router` plugin for Claude Code: skills listed by name, a search reminder, console notices
