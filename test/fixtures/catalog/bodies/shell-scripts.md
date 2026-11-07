# Shell scripts

Apply this skill when a Bash or POSIX `sh` script is written, fixed or reviewed - install scripts, CI steps, cron jobs, small automation.

## Header

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

- `-e` exits on an unhandled failure, `-u` on an unset variable, `pipefail` makes a pipeline fail if any stage fails.
- Know the gaps of `set -e`: it is ignored inside `if` conditions, `&&`/`||` lists and functions called from them, and command substitutions in some contexts. Check critical commands explicitly.
- For `/bin/sh` scripts, `pipefail` is not POSIX everywhere; use it only if the target shells support it (dash supports it since 0.5.11).

## Quoting

- Quote every expansion: `"$file"`, `"${array[@]}"`, `"$(command)"`. Unquoted variables split on spaces and expand globs.
- Use `[[ ... ]]` in Bash, `[ ... ]` with quoted operands in POSIX sh.
- Use `--` before file arguments that may start with a dash: `rm -- "$f"`.
- Use `printf '%s\n' "$x"` rather than `echo` for arbitrary data.

## Errors and cleanup

```bash
tmpdir=$(mktemp -d)
trap 'rm -rf -- "$tmpdir"' EXIT
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
command -v jq >/dev/null || die "jq is required"
```

Messages go to stderr; data goes to stdout. Exit codes mean something: 0 success, 1 general error, 2 usage error.

## Arguments

Use `getopts` for short options in portable scripts; a `while`/`case` loop over `"$@"` for long options in Bash. Print usage on `-h` and on bad input. Validate required arguments early.

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--dry-run) dry_run=1; shift ;;
    -o|--output) output=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done
```

## Portability and checks

| Avoid | Portable alternative |
|---|---|
| `sed -i` (GNU vs BSD differ) | write to a temp file and `mv`, or `sed -i.bak` |
| `readlink -f` on macOS | `cd "$(dirname "$0")" && pwd -P` |
| `grep -P` | `grep -E` |
| `$'...'`, arrays, `[[` in `sh` | use `bash` explicitly |
| `date -d` | GNU only; macOS uses `date -j -f` |

Run ShellCheck on every script (`shellcheck -x script.sh`) and fix or explicitly disable each warning with a reason. Format with `shfmt`. Test with Bats when the script has logic worth testing.

## Pitfalls

- `cd "$dir"` without `|| exit`; the rest of the script runs in the wrong directory.
- Parsing `ls` output; use globs or `find -print0` with `xargs -0`.
- `for f in $(cat list)` splitting on spaces; use `while IFS= read -r f`.
- Secrets in command-line arguments, visible in `ps`.

When a script grows past a couple of hundred lines with data structures, consider Python (see python-style). Regex in `grep` and `sed` calls is covered by regex-help, and server administration commands by linux-admin.
