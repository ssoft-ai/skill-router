# Translation

Apply this skill when a document, a set of interface strings, an email or other text has to be rendered in another language for its readers.

## Before translating

- Identify the audience and register: end users, lawyers, engineers; formal or informal address (German Sie/du, French vous/tu, Japanese keigo levels). Ask if unclear.
- Collect the glossary: product names, feature names and domain terms with their approved translations. Terms that must stay in the source language (brand names, command names, code identifiers) are marked "do not translate".
- Check for a style guide or previous translations (a translation memory, TMX file, or earlier releases) and stay consistent with them.

## Interface strings

- Work in the localisation format, not in copied text: gettext `.po`, Android `strings.xml`, iOS `.strings`/`.xcstrings` catalogues, ICU MessageFormat in JSON, XLIFF, Fluent `.ftl`, Java `.properties`.
- Keep placeholders exactly: `{count}`, `%1$s`, `%@`, `{{name}}`. Their order may change in the target language; positional placeholders allow that.
- Plurals: use the format's plural rules (CLDR categories `one`, `few`, `many`, `other`). Russian, Polish and Arabic need more forms than English; never build plurals by appending "s".
- Gender and grammatical case may require separate strings or ICU `select`.
- Respect length limits: German and Finnish run about 30% longer than English; check buttons and labels in the UI or with pseudo-localisation.
- Read the translator comment or context for each key; "Open" as a verb and as an adjective translate differently.

## Documents and emails

1. Translate meaning, not words; restructure sentences that would be unnatural.
2. Keep formatting: headings, lists, tables, links, bold, code blocks untouched.
3. Localise conventions: dates (2026-11-07 vs 07.11.2026 vs 11/07/2026), number separators (1,234.5 vs 1 234,5), currency placement, units, address order, phone formats.
4. Do not translate quotations from legal texts or standards yourself if an official translation exists; cite it.
5. Mark anything uncertain for the reviewer instead of guessing.

## Review

- A second pass by a native speaker of the target language, ideally with domain knowledge.
- Back-translation for high-risk texts (medical, legal, safety): a separate translator renders it back to the source and differences are reviewed.
- Check the rendered result in context - screenshots of the localised UI, the PDF with the target fonts (CJK, Arabic and Hebrew right-to-left layout).

## Pitfalls

- Concatenated strings ("You have " + n + " messages") that cannot be translated correctly.
- Machine translation output published without review.
- Inconsistent terms across one document because different parts were translated separately.

Localised release notes follow release-notes in documents, emails follow email-drafting, and right-to-left layout fixes go through css-layout.
