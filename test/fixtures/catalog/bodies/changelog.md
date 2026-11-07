# Changelog

Apply this skill when CHANGELOG.md is edited: a user-visible change is merged, or a version is cut and the unreleased entries move under a version heading.

## Format

Follow Keep a Changelog 1.1 with Semantic Versioning:

```markdown
# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- `--json` output for the `status` command.

### Fixed
- Config files with a UTF-8 BOM are now read correctly.

## [2.4.0] - 2026-10-21

### Changed
- Default timeout raised from 10 s to 30 s.

### Deprecated
- The `legacy-auth` option; it will be removed in 3.0.0.

[Unreleased]: https://example.com/compare/v2.4.0...HEAD
[2.4.0]: https://example.com/compare/v2.3.1...v2.4.0
```

Section headings, in this order when present: Added, Changed, Deprecated, Removed, Fixed, Security. Dates in ISO 8601. Newest version on top. Link references at the bottom for comparisons between tags.

## What goes in

- Changes a user, operator or integrator of the project would notice: new features, changed defaults, removed options, fixed bugs they could have hit, security fixes.
- Not: refactors, test changes, CI tweaks, internal dependency bumps with no visible effect. A changelog is not `git log`.
- One entry per change. If a later change in the same release modifies an earlier unreleased one, edit the first entry instead of adding a second.

## Writing an entry

- Start with what changed for the reader, in past or present tense consistently across the file.
- Name the command, option, endpoint or file involved in backticks.
- Link the issue or pull request if the project does: `(#482)`.
- Mark breaking changes clearly, for example with a **Breaking:** prefix, and say what users must do.

## Cutting a version

1. Decide the version number from the entries: a Removed or breaking Changed entry means a major bump (after 1.0.0), Added means minor, only Fixed means patch.
2. Rename `[Unreleased]` to the version with today's date, and add a fresh empty `[Unreleased]` above it.
3. Update the comparison links.
4. Commit together with the version bump and tag.

## Pitfalls

- Entries written at release time from memory; add them in the same pull request as the change.
- Generated changelogs dumped from commit subjects without editing.
- Yanked releases removed instead of marked `[YANKED]`.

Gathering what went into a version from merged pull requests is the job of release-notes, the version-control one. Customer-facing announcements are written per the release-notes skill under documents, and commit messages per git-commits.
