# README writing

Apply this skill when a repository gets its first README, or when the existing one no longer matches how the project is installed, configured or used.

## Who reads it

A README is the landing page of a repository. Its readers arrive with one of three questions, and each needs an answer within the first screen:

1. What is this, and is it for me?
2. How do I get it running?
3. Where do I go next (docs, issues, contributing)?

## Structure

```markdown
# project-name

One or two sentences: what it does and for whom.

## Install
## Quick start
## Configuration
## Documentation
## Contributing
## License
```

- Opening paragraph: the problem it solves, not its internals. "Converts bank statement exports into ledger entries" beats "A modular, extensible pipeline framework".
- Badges only if they carry information the reader uses (build status, latest version, licence); a row of twelve badges is noise.
- Install: exact commands for each supported platform, with prerequisites and versions (`Node.js 20+`, `Python 3.11+`, `libpq`). Copy-pasteable, no prompt characters in code blocks.
- Quick start: the shortest path to a visible result - one command or a five-line code sample - and what the reader should see.
- Configuration: a table of options or environment variables with default and meaning, or a link to the full reference.
- Links to longer documentation rather than everything inline. A README over a few screens should become a docs site (MkDocs, Docusaurus, Sphinx) with the README pointing at it.
- Licence name and a link to the `LICENSE` file; `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` linked if present.

## Steps

1. Clone the repository into a clean environment (a fresh container or VM) and follow the README literally. Every place you had to guess is a gap.
2. Write or fix the sections above in that order.
3. Run every command and code sample; better, test them in CI (doctest, `mdsh`, or a script that extracts code blocks).
4. Add a screenshot or a terminal recording (asciinema, VHS) if the tool's output is visual.
5. Ask someone new to the project to follow it and watch where they stop.

## Checklist

- [ ] First sentence says what the project is
- [ ] Supported platforms and versions stated
- [ ] Every command tested from a clean checkout
- [ ] No internal hostnames, tokens or personal paths in examples
- [ ] Links resolve (check with `lychee` or `markdown-link-check`)

## Pitfalls

- Status, roadmap and "coming soon" lists that go stale within weeks.
- Instructions that assume the author's machine (`~/projects/...`, a global tool nobody else has).
- Duplicating the CLI's `--help` output by hand; generate it or link to it.

The history of changes belongs in a changelog, not the README. Architecture pictures come from diagramming, and HTTP API details from api-reference-docs.
