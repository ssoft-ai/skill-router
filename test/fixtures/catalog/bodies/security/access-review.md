# Access review

Apply this skill when you check who holds which access to systems and data, after a person leaves or changes role, or as the periodic recertification an auditor asks for.

## Scope the review

List the systems in scope and, for each, where its accounts and grants live:

- Identity provider: Okta, Microsoft Entra ID (Azure AD), Google Workspace - users, groups, app assignments.
- Cloud: AWS IAM users, roles and policies, Azure RBAC role assignments, GCP IAM bindings.
- Code hosting: organisation owners, team memberships, outside collaborators, deploy keys, personal access tokens.
- Databases: roles and grants (`\du` and `\dp` in psql, `SHOW GRANTS` in MySQL).
- SaaS admin consoles, VPN, SSH `authorized_keys` on servers, shared mailboxes.
- Machine identities: service accounts, API keys, OAuth apps with tenant-wide consent.

## Steps

1. Export the current grants from each system to a spreadsheet or CSV: identity, system, role or permission, granted when, last used.
2. Join with the HR roster. Flag accounts of leavers, accounts with no owner, and accounts that do not match a person.
3. Use last-activity data: AWS IAM Access Analyzer and "last accessed" information, Entra sign-in logs, token `last_used_at`. Access unused for 90 days is a candidate for removal.
4. Send each team lead the list of their people's access and ask them to confirm or revoke, item by item. Silence is not approval.
5. Remove or downgrade, record the change and the approver, and keep the evidence for audit (SOC 2, ISO 27001 control A.5.18).
6. Fix the cause: if access was granted to individuals directly, move it to groups or roles so the next review is smaller.

## Rules

- Role-based access: permissions attach to roles, people join roles. Direct grants need a reason.
- Least privilege and separation of duties: whoever approves payments should not also create vendors.
- Privileged access is time-bound where the platform allows (just-in-time elevation, Entra PIM, AWS IAM Identity Center with session limits).
- Break-glass accounts exist, are vaulted, alert on use, and are tested.
- Leaver process: disable in the identity provider on the last day, then revoke local accounts and tokens the IdP does not control.

## Pitfalls

- Disabling the SSO account but leaving personal access tokens and SSH keys active.
- Shared accounts that make "who did it" impossible to answer.
- Nested groups hiding effective permissions; review the effective result, not just direct memberships.
- Service accounts owned by someone who left.

Tokens that turn up in code during the review go through secret-scanning. Server accounts and sudoers are handled with linux-admin, and the overall rules in security.
