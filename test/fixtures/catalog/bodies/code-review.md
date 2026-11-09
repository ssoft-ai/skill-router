# Code review

Apply this skill when you review a pull request, a merge request or a diff someone has shared, whether you are a teammate or the last gate before merge.

## Order of reading

1. Read the description and the linked issue. What is the change supposed to do? If you cannot tell, that is the first finding.
2. Check the size. Past roughly 400 changed lines, review quality drops; ask for a split if it can be split.
3. Read the tests first: they show the intended behaviour and which cases the author thought of.
4. Read the main change top-down from the entry point (handler, public function, CLI command), then the helpers.
5. Run it locally when the behaviour is not obvious from the diff: check out the branch, run the tests, try the edge case you suspect.

## What to look for

| Area | Questions |
|---|---|
| Correctness | Does it do what the issue asks? Off-by-one, null or empty input, error paths, concurrency, time zones? |
| Tests | Would a test fail if the change were reverted? Are failure paths tested? |
| Design | Is the code in the right module? Does it duplicate something that exists? Is the abstraction earning its keep? |
| Readability | Names that say what, functions that do one thing, comments that say why |
| Security | Untrusted input, authorisation checks, secrets, injection |
| Operability | Logging, metrics, migrations safe under rolling deploy, feature flag |
| Compatibility | Public API, database, config or file format changes |

## Writing a finding

Each comment states the problem, its consequence, and a fix or a question:

> `parseDate` returns `null` for "2026-02-30" but the caller dereferences it at line 88, so a bad date from the import crashes the whole batch. Return a validation error instead, or skip the row and count it.

- Mark severity: blocking, should fix, nit or optional. Prefix nits with "nit:" so they are not mistaken for blockers.
- Comment on the code, not the person. "This loop..." rather than "You...".
- Suggest with GitHub's ```` ```suggestion ```` blocks or GitLab's suggestions for small, mechanical fixes.
- Ask when unsure: "Is it intended that...?" is better than a confident wrong claim.
- Praise specific good decisions briefly; it tells the author what to keep.

## Verdict

Approve when no blocking finding remains, even if nits are open. Request changes only for blocking findings, and say which ones. Re-review the whole updated diff, not just the lines that answer your comments.

## Pitfalls

- Bikeshedding on style that a formatter (Prettier, Black, gofmt) or linter should enforce.
- Rubber-stamping large changes because they are large.
- Reviewing the diff without the surrounding code; open the full file.

Commit structure is judged against git-commits. Security-sensitive changes get a pass with security, and bug suspicions are confirmed with debugging before you report them as fact.
