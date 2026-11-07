# Dependency audit

Apply this skill when a scanner flags a vulnerable package, a new third-party library is proposed, or the dependency tree of a project is reviewed before a release.

## Tools

| Ecosystem | Command |
|---|---|
| npm / pnpm / Yarn | `npm audit --omit=dev`, `pnpm audit` |
| Python | `pip-audit`, `safety` |
| Java / Kotlin | OWASP Dependency-Check, `gradle dependencyCheckAnalyze` |
| Go | `govulncheck ./...` |
| Rust | `cargo audit` |
| .NET | `dotnet list package --vulnerable --include-transitive` |
| Containers | Trivy, Grype |
| Cross-ecosystem | OSV-Scanner, Snyk, Dependabot alerts, Renovate |

Generate a software bill of materials (SBOM) in CycloneDX or SPDX format with Syft or the build plugin, and keep it with the release artefacts.

## Triage of a reported vulnerability

1. Identify the CVE or GHSA ID, the affected version range and the fixed version.
2. Is the vulnerable package actually used at runtime, or only in development or tests? Is the vulnerable function reachable from your code? `govulncheck` reports reachability; for others, read the advisory and search the call sites.
3. Score in context: CVSS base score, EPSS probability of exploitation, presence in the CISA KEV catalog, and whether the input it needs can reach it in your deployment.
4. Decide: upgrade, patch (override or resolution to a fixed transitive version), mitigate (configuration, WAF rule), or accept with a written reason and an expiry date. Record accepted risks in a VEX statement or the scanner's ignore file with a comment.

## Vetting a new package

- Maintenance: last release, open issue response, number of maintainers. A single maintainer who stopped answering two years ago is a risk.
- Popularity is not safety, but very low download counts with a name close to a popular package suggest typosquatting.
- OpenSSF Scorecard result, signed releases, provenance (npm provenance, Sigstore).
- Install scripts (`postinstall`) that download or execute code.
- Transitive weight: how many packages come with it.
- Licence compatibility: GPL or AGPL in a proprietary product, or no licence at all, needs a legal decision. Check with `license-checker` or `pip-licenses`.

## Rules

- Commit lockfiles (`package-lock.json`, `poetry.lock`, `Cargo.lock`) and install with the frozen variant (`npm ci`) in CI.
- Pin build tools and GitHub Actions to a commit SHA.

## Pitfalls

- `npm audit fix --force` jumping major versions without tests.
- Ignoring dev dependencies entirely; build-time compromise reaches the artefact.

Executing the upgrades in batches belongs to dependency-updates. Leaked tokens found during the audit go to secret-scanning, and the parent rules are in security.
