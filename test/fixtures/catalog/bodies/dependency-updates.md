# Dependency updates

Apply this skill when a project's packages have fallen behind, or an update bot has opened a stack of pull requests that someone has to get through.

## Plan the batches

1. List what is outdated: `npm outdated`, `pnpm outdated`, `pip list --outdated` or `uv pip list --outdated`, `poetry show --outdated`, `./gradlew dependencyUpdates` (Ben Manes versions plugin), `mvn versions:display-dependency-updates`, `go list -u -m all`, `cargo outdated`, `dotnet list package --outdated`.
2. Sort by risk:
   - patch and minor updates of well-behaved libraries - one batch;
   - dev tooling (linters, test runners, type definitions) - one batch;
   - each major update - its own batch;
   - frameworks and runtimes (React, Spring Boot, Django, Node.js, the JDK) - their own planned piece of work.
3. Security fixes jump the queue regardless of size.

## For each batch

1. Read the changelogs and release notes between your version and the target, not only the target's. Look for "BREAKING", "removed", "deprecated", changed defaults, and a raised minimum runtime version. Migration guides and codemods (`npx @next/codemod`, OpenRewrite recipes, `pyupgrade`, `django-upgrade`) save time.
2. Update the manifest and regenerate the lockfile in the same commit.
3. Run the full test suite, the build and the linters. Then run the application and click through the paths the library affects; tests rarely cover everything a framework upgrade touches.
4. Check deprecation warnings in the test output and fix them now, while the context is fresh.
5. Commit one batch per pull request with the list of packages and versions in the description.

## Update bots

- Renovate or Dependabot with grouping rules: group by ecosystem or by package family (`@aws-sdk/*`, `eslint*`), and a schedule (weekly, Monday morning) so pull requests do not arrive one at a time all week.
- Automerge patch updates of dev dependencies when CI is green; never automerge majors.
- Pin GitHub Actions and Docker base images and let the bot bump the digests.
- A dependency dashboard issue gives the overview; close stale bot pull requests rather than letting them rot.

## When an update breaks something

| Option | When |
|---|---|
| Fix your code | the break is a documented API change |
| Pin the old version with a comment and a ticket | the fix is large; set a revisit date |
| Report upstream | it is a regression; link the issue in your pin comment |
| Override a transitive version | a sub-dependency needs a fix (`overrides` in npm, `resolutions` in Yarn, constraints in pip) |

## Pitfalls

- Updating everything at once and being unable to tell which package broke the build.
- Lockfile-only changes without testing, because "it's just a patch".
- Ignoring peer dependency warnings.
- Letting the backlog grow for a year, until every update is a major migration.

Vulnerability triage and vetting of new packages belong to dependency-audit. CI caching that should key on the lockfile is set up in ci-pipelines, and the pull request review goes through code-review.
