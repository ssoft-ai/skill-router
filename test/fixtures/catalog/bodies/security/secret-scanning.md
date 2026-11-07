# Secret scanning

Apply this skill when an API key, token, password, private key or connection string may have been committed to a repository, pasted into a ticket, or printed to a build or application log.

## First: rotate, then clean

A secret that reached a remote repository, a CI log or a chat must be treated as compromised, even if the commit was removed a minute later. Forks, clones, caches and mirror bots may already have it. The order is:

1. Revoke or rotate the credential at its issuer (cloud console, SaaS admin page, database `ALTER USER ... PASSWORD`).
2. Deploy the new value through the secret manager and confirm services still work.
3. Check the issuer's audit logs (CloudTrail, GCP audit logs, the SaaS access log) for use of the old credential since the leak.
4. Only then clean the history if needed.

## Finding secrets

| Tool | Use |
|---|---|
| gitleaks | `gitleaks detect --source . --log-opts="--all"` for full history; `gitleaks protect --staged` as a pre-commit hook |
| TruffleHog | `trufflehog git file://. --only-verified` checks whether found keys are live |
| detect-secrets | baseline file for existing findings, pre-commit plugin |
| GitHub secret scanning / push protection, GitLab secret detection | server-side, blocks pushes with known token formats |

Scan also: CI job logs and artefacts, Docker image layers (`docker history`, or Trivy with the secret scanner), Terraform state files, `.env` files in backups, and log stores.

## Cleaning history

Rewriting history does not undo the leak; it only stops new copies.

- `git filter-repo --replace-text replacements.txt` or BFG Repo-Cleaner to remove the value from all commits.
- Force-push every branch and tag, ask collaborators to re-clone, and ask the hosting provider to purge cached views and pull request refs if needed.
- Delete affected CI logs and artefacts.

## Prevention

- Pre-commit hook with gitleaks or detect-secrets on every developer machine, plus the same scan in CI.
- `.gitignore` entries for `.env`, `*.pem`, `*.p12`, `credentials.json`, `terraform.tfstate`.
- Applications read secrets from the environment or a mounted file provided by the secret manager.
- Log redaction: mask `Authorization` headers, `password` fields and known token patterns in the logging library.
- Short-lived credentials (OIDC from CI to the cloud) so a leaked one expires in minutes.

## Pitfalls

- Marking a real secret as a false positive in the baseline file.
- Rotating the key but leaving the old one valid.
- Test fixtures with real-looking keys that train people to ignore findings; use clearly fake values.

Reviewing who else holds access after the leak follows access-review. Regex patterns for custom token formats are written with regex-help, and broader context is in security.
