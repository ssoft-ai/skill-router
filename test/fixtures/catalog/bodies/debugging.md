# Debugging

Apply this skill when code does something it should not, a test fails and the reason is not obvious, or a fix has already been tried without success.

## Steps

1. Reproduce. Write down the exact input, environment, versions and the command that shows the failure. If it is intermittent, find the conditions that raise its frequency (load, a particular seed, parallel test runs). A defect you cannot reproduce cannot be shown fixed.
2. Shrink the reproduction. Remove inputs, steps and code until removing anything more makes the failure disappear. A failing unit test is the best form; a script is next.
3. Read the actual error. Full stack trace, the first exception in a chain ("Caused by"), the log lines just before it. Search the exact message in the issue tracker and the library's issues.
4. Form one hypothesis that explains all the symptoms, and a check that would refute it. Write both down.
5. Test it with the cheapest probe: a log line, a breakpoint, an assertion, a changed input. Change one thing at a time.
6. Narrow the search space by halving:
   - in time: `git bisect start; git bisect bad; git bisect good v2.3.0`, then `git bisect run ./repro.sh`;
   - in code: comment out or stub half the pipeline;
   - in data: split the input file in two.
7. When you know the cause, write a test that fails because of it, then fix, then watch the test pass.
8. Ask whether the same mistake exists elsewhere: search for the pattern.

## Tools

| Situation | Tool |
|---|---|
| Step through code | IDE debugger, `pdb`/`breakpoint()`, `node --inspect`, `dlv`, `gdb`/`lldb` |
| What changed? | `git bisect`, `git log -S'term'`, diff of lockfiles |
| System calls, files, network | `strace -f`, `ltrace`, `dtruss`, Process Monitor, Wireshark, `tcpdump` |
| Memory corruption | AddressSanitizer, Valgrind |
| Concurrency | ThreadSanitizer, `-race` in Go, stress loops |
| Production only | logs, traces, core dumps, feature-flagged extra logging |

## Rules

- Do not fix symptoms you do not understand. A `try/except: pass` or a `sleep(2)` that makes a test green is not a fix.
- Keep a short log of what you tried and what happened; it stops loops and helps whoever comes next.
- Check your assumptions explicitly: is the code you are reading the code that runs? Right branch, rebuilt, cache cleared, right config file loaded.
- Suspect recent changes first, then the boundaries (I/O, parsing, time, encoding), then the platform.

## Pitfalls

- Heisenbugs that vanish under the debugger because timing changed; use logging with timestamps instead.
- Two defects producing one symptom: after the first fix, recheck the original reproduction.
- Trusting the bug report's diagnosis instead of its observations.

Evidence that lives only in logs is read with log-analysis. Slowness rather than wrong behaviour goes to performance-profiling, and the regression test follows unit-testing.
