# Release notes from version control

Apply this skill when the contents of a version have to be gathered from the repository - every pull request merged since the previous tag - into a draft that the team can edit.

## Find the range

1. Identify the previous release tag: `git describe --tags --abbrev=0` on the release branch, or the latest entry of `git tag --sort=-creatordate`. Check that the tag is on the same line of history; a tag on a maintenance branch is not an ancestor of `main`.
2. List the merge or squash commits in the range: `git log v2.3.0..HEAD --first-parent --oneline`.
3. Map commits to pull requests: from squash commit subjects (`(#481)`), from merge commit messages, or by asking the forge, for example `gh pr list --state merged --search "merged:>=2026-10-01" --json number,title,labels,author` or the GitLab merge requests API.
4. Include cherry-picks and backports explicitly when the release branch received them.

## Classify

Sort each pull request by its labels or Conventional Commit type:

| Label / type | Section |
|---|---|
| `feature`, `feat` | New features |
| `enhancement`, `perf` | Improvements |
| `bug`, `fix` | Bug fixes |
| `security` | Security |
| `breaking`, `!` in type | Breaking changes (top of the draft) |
| `deps` | Dependency updates (collapsed) |
| `chore`, `ci`, `test`, `docs`, `refactor` | omitted or listed under Maintenance |

Pull requests without a label go into an "Unclassified" list for a human to sort; do not guess silently.

## Tools

- GitHub: the "Generate release notes" button or `gh release create v2.4.0 --generate-notes`, configured by `.github/release.yml` (categories by label, excluded authors such as bots).
- Release Drafter keeps a draft release updated on every merge.
- release-please, semantic-release and Changesets derive the version and notes from commits or changeset files.
- git-cliff and conventional-changelog for template-based output from commit history.

## Draft format

```markdown
## v2.4.0 (draft)

### Breaking changes
- Removed the deprecated `/v1/export` endpoint (#455) @lena

### New features
- Bulk invite users from a CSV upload (#462) @omar

### Bug fixes
- Fix timezone shift in weekly report emails (#470) @lena

**Full diff:** v2.3.0...v2.4.0
```

## Checks

- [ ] Every PR in the range appears exactly once (compare counts)
- [ ] Reverted PRs and their reverts both removed
- [ ] Breaking changes confirmed with the authors
- [ ] Contributors credited, bots excluded
- [ ] Compare link points at the right tags

## Pitfalls

- Using `git log` without `--first-parent`, which lists every commit inside merged branches.
- Draft dates and versions guessed before the tag exists.
- PR titles copied verbatim when they are unclear; edit them in the draft.

The curated entries for CHANGELOG.md come from this draft through changelog. The customer-facing text is rewritten with release-notes under documents, and commit subjects worth harvesting follow git-commits.
