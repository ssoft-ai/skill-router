# Unit testing

Apply this skill when a function, class or module gets new tests, or when an existing unit test is slow, flaky or hard to understand.

## What a unit test is here

A unit test exercises one behaviour of a small piece of code in memory: no network, no real database, no file system beyond a temporary directory, no sleeping. The whole suite runs in seconds, so people run it on every save.

## Writing a test

1. Name the behaviour, not the method: `returns_zero_for_empty_cart`, `test_rejects_expired_coupon`, `it("rounds half to even")`.
2. Arrange, act, assert - three visible blocks. One act per test.
3. Assert on outputs and observable effects, not on private fields or the order of internal calls.
4. Use the smallest input that shows the behaviour; build objects with factory helpers or test data builders that fill in irrelevant fields.
5. Cover the edges deliberately: empty, one, many; zero, negative, maximum; null or missing; unicode; boundaries of every range.
6. Make the failure message useful. `assertEqual(expected, actual)` in the right order; custom messages where the assertion alone is cryptic.

## Test doubles

| Double | Use |
|---|---|
| Stub | returns canned answers to queries |
| Fake | working lightweight implementation (in-memory repository) |
| Mock | verifies that a command was sent to a collaborator |
| Spy | records calls on a real object |

Mock only what you own or what crosses a process boundary. Mocking a library's internals ties the test to its implementation. Prefer fakes for repositories and clocks; inject a clock instead of calling `now()`.

Frameworks: pytest (fixtures, `parametrize`), JUnit 5 (`@ParameterizedTest`), Jest or Vitest, Go's `testing` with table-driven tests, xUnit or NUnit, RSpec. Property-based testing (Hypothesis, fast-check, jqwik) finds edge cases you did not list - use it for parsers, serialisers and anything with an inverse.

## Flaky tests

Common causes: shared mutable state between tests, test order dependence, real time and time zones, random values without a fixed seed, concurrency, leftover files. Run the suspicious test in a loop and in random order (`pytest -p randomly`, `--shuffle`), fix the cause, and never add retries to hide it.

## Checklist

- [ ] Each test fails if the behaviour it names breaks (try it: break the code)
- [ ] No test depends on another having run
- [ ] No sleeps; no network
- [ ] Coverage reviewed for untested branches, not chased as a number

## Pitfalls

- Testing getters and framework code instead of logic.
- One giant test with twenty assertions that stops at the first failure.
- Snapshot tests nobody reads when they change.

React components have their own approach in react-testing. Tests that guard a restructuring are discussed in refactoring, and a failing test with an unclear reason goes to debugging.
