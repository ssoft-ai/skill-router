# CI pipelines

Apply this skill when continuous integration is set up for a repository, or an existing pipeline is slow, flaky or not trusted.

## Shape of a good pipeline

1. Fast checks first: formatting, lint, type check, unit tests - fail within a few minutes.
2. Build once, produce an immutable artefact (package, image digest), and pass it to later jobs rather than rebuilding.
3. Slower checks in parallel: integration tests, end-to-end tests, security scans.
4. Required status checks on the protected branch so nothing merges red.
5. Deployment jobs, if any, consume the artefact and run only on the main branch or tags, with environment protection rules.

## GitHub Actions example

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@<pinned-sha>
      - uses: actions/setup-node@<pinned-sha>
        with: { node-version: ${{ matrix.node }}, cache: npm }
      - run: npm ci
      - run: npm test
```

In GitLab CI the same ideas map to `stages`, `needs:` for a DAG, `cache:` with `key: files: [package-lock.json]`, `rules:` instead of `only/except`, and `interruptible: true`.

## Speed

| Technique | Effect |
|---|---|
| Dependency cache keyed on the lockfile hash | skips downloads |
| Build cache (Gradle, Bazel remote cache, Docker layer cache with `cache-from`) | skips unchanged work |
| Test sharding across parallel jobs | divides wall time |
| Path filters (`paths:`, `rules: changes:`) | skips irrelevant jobs in monorepos |
| Cancel superseded runs | frees runners |
| Larger or self-hosted runners | for CPU-bound builds |

Measure first: look at the job timeline and the slowest steps over the last 50 runs.

## Flakiness

Track failure rate per test across runs (most CI platforms or a test analytics tool can show it). Quarantine a flaky test with an owner and a ticket, then fix it; automatic retries are a short-term bandage that hides real failures.

## Security

- Least-privilege `permissions:` for the token; no write access by default.
- Pin third-party actions to a commit SHA.
- Secrets only in protected environments; never echo them. Pull requests from forks get no secrets.
- Use OIDC federation to cloud providers instead of long-lived keys.
- Beware `pull_request_target` with checkout of the PR head; it runs untrusted code with secrets.

## Pitfalls

- Caching `node_modules` across lockfile changes.
- Tests that pass only because of state left by a previous job on a self-hosted runner.

Container builds in the pipeline follow docker-images. Release tagging and notes are covered by changelog, and step scripts follow shell-scripts.
