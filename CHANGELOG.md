# Changelog

All notable changes to skill-router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- [router] Added the MCP tools `search_skills` and `load_skill`, finding skills at any folder depth
- [router] Left out of the index a `SKILL.md` larger than 1 MiB
- [sources] Searched the installed Claude Code plugins and the Claude Code and Codex skill folders
- [sources] Searched the claude.ai skills synced for the account Claude Code is signed in to
- [sources] Searched the skills Codex ships in `$CODEX_HOME/skills/.system`
- [sources] Skipped the folders named with a leading dot and the `node_modules` folders
- [sources] Left out a project skill of Claude Code that a user skill of the same name hides
- [search] Searched the instructions of each skill besides its name and description
- [search] Matched a common abbreviation, such as PR, to its full form, such as pull request
- [search] Returned the skills of one name as one result with the path and description of each
- [plugin] Added the `skill-router` plugin for Claude Code
- [plugin] Listed every installed skill by name alone, unless the option `skill_names_only` is off
- [plugin] Reminded the agent on each request to search the skills before any other tool
