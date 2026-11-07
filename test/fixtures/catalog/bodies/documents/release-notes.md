# Release notes for customers

Apply this skill when a product version is announced to the people who use it - in an in-app "What's new" panel, a help-centre article, an email to administrators or a download page.

## Audience before content

Customer release notes are not a commit log. Group them by who is affected and what they need to do:

- End users: what they will see and how it helps them.
- Administrators: settings, permissions, SSO or SCIM changes, new audit events.
- Developers and integrators: API, webhook and SDK changes, deprecations with dates.

If a version has nothing for a group, leave that group out.

## Structure

1. Version number and release date (ISO date, for example 2026-11-07).
2. Highlights: two or three changes that matter most, each in one or two sentences, with a screenshot or short GIF if the change is visual.
3. Action required: anything the reader must do, with a deadline. This section goes at the top when it exists.
4. New, Improved, Fixed: short entries, each starting with what the user can now do.
5. Known issues and workarounds.
6. Links: documentation, migration guide, support contact.

## Writing an entry

| Weak | Better |
|---|---|
| Refactored export service | Exports of more than 10,000 rows now finish in seconds instead of minutes |
| Fixed bug #4821 | Invoices no longer show the wrong currency symbol for Swiss franc accounts |
| Added SAML support | Administrators can now let staff sign in with their company identity provider (SAML 2.0) |

Write from the reader's side: "You can now..." rather than "We have implemented...". Keep internal codenames, ticket numbers and team names out unless customers know them.

## Steps

1. Get the list of changes in the version from engineering (the internal draft produced by the release-notes skill for version control, or the product backlog).
2. Drop internal-only changes: refactors, test infrastructure, dependency bumps without visible effect.
3. Rewrite each remaining item for its audience.
4. Have product and support review; support knows which wording will generate tickets.
5. Localise if the product ships in several languages.
6. Publish together with the rollout, not before.

## Pitfalls

- Announcing a feature that is behind a flag for most customers; say "rolling out over the next two weeks".
- Breaking changes hidden in "Improved".
- Inconsistent version naming between the app, the website and the notes.

Translating the notes follows translation. The developer-facing CHANGELOG.md is kept with changelog, and the announcement email is drafted with email-drafting.
