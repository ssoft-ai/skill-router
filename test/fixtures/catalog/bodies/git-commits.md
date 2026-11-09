# Git commits

Apply this skill when changes are committed, or when a branch's history is reshaped before it goes up for review.

## One logical change per commit

A commit should be something a reviewer can understand alone and a maintainer can revert alone. Signs that a commit holds more than one change:

- The message needs "and" to describe it.
- It mixes a reformatting or a rename with a behaviour change.
- Half of it could be reverted without breaking the other half.

Use `git add -p` to stage hunks selectively, and `git commit --fixup=<sha>` for corrections to an earlier commit on the same branch.

## Message format

```
Reject expired coupons at checkout

The checkout accepted coupons past their end date because the
comparison used the server's local time zone. Compare in UTC and
return 422 with code COUPON_EXPIRED.

Refs: SHOP-412
```

- Subject line: imperative mood ("Add", "Fix", "Remove"), about 50 characters, no trailing period, capitalised unless the project uses Conventional Commits (`fix(checkout): reject expired coupons`).
- Blank line, then a body wrapped at 72 columns: why the change was needed and what it does, not a narrative of how you found it.
- Trailers at the end: issue references, `Co-authored-by:`, `Signed-off-by:` when the project requires DCO.

## Cleaning a branch before review

1. `git fetch` and rebase onto the target: `git rebase origin/main`.
2. Squash fixups: `git rebase --autosquash origin/main` (non-interactive with `GIT_SEQUENCE_EDITOR=:` if your setup cannot open an editor).
3. Reorder so that preparatory refactors come before the feature that uses them.
4. Make sure each commit builds and passes tests: `git rebase --exec "make test" origin/main`.
5. Push with `--force-with-lease`, never plain `--force`, and only to your own branch.

## Rules

- Never rewrite history that others have built on (`main`, release branches, shared feature branches).
- No generated files, build outputs or secrets in commits; check `git diff --staged` before every commit.
- Large binary assets go through Git LFS.
- Sign commits (`git commit -S`, GPG or SSH signing) if the repository requires verified commits.
- Merge strategy follows the project: squash merge, rebase merge or merge commits. Do not mix them within one repository's main branch.

## Pitfalls

- "WIP", "fix", "address review" commits left in the final history.
- A rebase that silently drops a commit after a conflict; compare `git range-diff` before and after.
- Line-ending churn from `core.autocrlf`; set a `.gitattributes` with `* text=auto`.

What the reviewer looks at next is described in code-review. User-visible changes also get an entry per changelog, and the decision to split a large refactor into steps comes from refactoring.
