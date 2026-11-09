# Changelog

All notable changes to skill-router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- [router] Added the MCP tools `search_skills` and `load_skill`, finding skills at any folder depth
- [sources] Searched the installed Claude Code plugins and the Claude Code and Codex skill folders
- [search] Ranked higher a skill whose `metadata.paths` matches a project file
- [search] Searched the instructions of each skill besides its name and description
- [plugin] Added the `skill-router` plugin for Claude Code
- [plugin] Reminded the agent on each request to search the skills before any other tool
