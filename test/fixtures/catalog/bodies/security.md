# Security

Apply this skill whenever a change handles credentials, decides who may do what, accepts input from outside, or exposes something to the internet.

## Routing

| Concern | Skill |
|---|---|
| Vulnerable or risky third-party packages | dependency-audit |
| A key or password may have leaked | secret-scanning |
| A new feature's attack surface | threat-modelling |
| Who has which permissions | access-review |
| Certificates and HTTPS errors | tls-certificates |

## Baseline rules

- Treat every input from outside the process as hostile: HTTP parameters, headers, cookies, uploaded files, webhook payloads, message queue events, environment variables set by others. Validate type, length and format at the boundary, and encode output for its context (HTML, SQL, shell, LDAP).
- Parameterised queries only. String concatenation into SQL, shell commands or file paths is a finding, whatever the source of the string.
- Least privilege for people, services and tokens: scope API keys, use short-lived credentials (OIDC federation, STS, workload identity) instead of long-lived keys.
- Secrets live in a secret manager (Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Doppler), injected at runtime; never in code, images, or CI logs.
- Authenticate, then authorise every request on the server - including object-level checks. Insecure direct object references (changing `/orders/123` to `/orders/124`) remain one of the most common flaws.
- Defaults are safe: deny by default, secure cookies (`HttpOnly`, `Secure`, `SameSite`), security headers (Content-Security-Policy, HSTS, X-Content-Type-Options).
- Log security events (login, permission change, failed authorisation) without logging the secrets themselves.

## Review checklist

Use the OWASP Top 10 and the OWASP ASVS as the vocabulary:

- [ ] Broken access control: every endpoint checks the caller's rights to this object
- [ ] Injection: queries and commands parameterised
- [ ] SSRF: outbound requests to user-supplied URLs restricted by allowlist
- [ ] Deserialisation of untrusted data avoided or restricted to safe formats
- [ ] Cryptography: standard libraries, no home-made schemes; passwords hashed with Argon2id, bcrypt or scrypt
- [ ] Rate limiting on login, password reset and expensive endpoints
- [ ] File uploads: type checked by content, stored outside the web root, size-limited

## Pitfalls

- Security by obscurity: an undocumented endpoint is still reachable.
- Client-side checks treated as enforcement.
- Error messages that reveal stack traces, SQL or whether an account exists.
- "Temporary" open firewall rules and public buckets that become permanent.

Server-side input validation for forms is detailed in form-validation, and a vulnerability found in production is handled as an incident through incident-response.
