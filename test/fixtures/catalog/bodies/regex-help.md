# Regular expressions

Apply this skill when a pattern must match, extract, validate or replace text, or when someone needs an existing regular expression explained.

## Know the flavour

The same pattern behaves differently across engines. Ask or check which one runs it:

| Engine | Where | Notes |
|---|---|---|
| PCRE2 | PHP, `grep -P`, nginx | lookbehind, possessive quantifiers, recursion |
| ECMAScript | JavaScript | named groups `(?<name>...)`, `u` and `v` flags, lookbehind in modern engines |
| Python `re` | Python | `(?P<name>...)`, no possessive quantifiers before 3.11; `regex` module for more |
| RE2 | Go, Google Sheets `REGEXMATCH`, many log tools | linear time, no backreferences or lookaround |
| POSIX ERE/BRE | `grep -E`, `sed`, `awk` | no `\d` in BRE; use `[0-9]` or `[[:digit:]]` |
| .NET | C# | balancing groups, `RegexOptions.NonBacktracking` |

## Steps

1. Collect examples: at least five strings that must match and five that must not, including edge cases (empty, leading or trailing spaces, unicode, very long input).
2. Write the simplest pattern that separates them. Anchor it (`^...$` or `\A...\z`) when validating a whole value.
3. Test in regex101 (select the right flavour) or a unit test with both lists.
4. Explain it piece by piece, or write it in verbose mode (`re.VERBOSE`, `(?x)`) with comments.
5. Prefer a parser over a regex for nested or structured formats: HTML, JSON, CSV with quotes, email addresses in full RFC form, programming languages.

## Example

Match an ISO date `YYYY-MM-DD` and capture its parts:

```
^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])$
```

Must match: `2026-11-07`, `2024-02-29`. Must not match: `2026-13-01`, `2026-1-7`, ` 2026-11-07`. Note that it accepts `2026-02-31`; check calendar validity in code, not in the pattern.

## Performance and safety

- Catastrophic backtracking: nested quantifiers like `(a+)+$` or `(.*,)*` take exponential time on a non-matching input. This is a denial-of-service risk (ReDoS) when the input comes from users. Rewrite with atomic groups or possessive quantifiers, make alternatives mutually exclusive, or use a linear-time engine (RE2, .NET NonBacktracking).
- Use `[^"]*` instead of `.*?` when the delimiter is known.
- Compile once and reuse in loops.
- Escape user input before embedding it in a pattern (`re.escape`, a dedicated escape function in JavaScript).

## Pitfalls

- `.` does not match newlines without the `s` (dotall) flag.
- `\b` is ASCII-only in some engines; non-English words break.
- `\d` matches non-ASCII digits in Python 3 and .NET unless ASCII mode is set.
- Greedy `.*` swallowing the rest of the line in replacements.
- Shell quoting mangling backslashes; single-quote the pattern.

Patterns inside shell commands also follow shell-scripts. Finding errors in log lines is covered by log-analysis, and cleaning delimited files by csv-cleaning.
