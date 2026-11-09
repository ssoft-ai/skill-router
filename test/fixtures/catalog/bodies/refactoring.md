# Refactoring

Apply this skill when code has to be restructured - because it is duplicated, tangled, too long or hard to change - and its behaviour must stay exactly the same.

## Preconditions

- Tests that cover the behaviour you are about to touch. If there are none, write characterisation tests first: call the code with representative inputs and assert on whatever it returns today, bugs included. Approval testing tools (ApprovalTests, snapshot files) make this quick for large outputs.
- A green build on the starting commit.
- A clear target: what change will be easier after the refactoring? Refactoring with no following change in sight is often wasted.

## The loop

1. Pick one small, named refactoring.
2. Apply it - with the IDE's automated refactoring when available (rename symbol, extract method, inline variable, move class, change signature); they are safer than hand edits.
3. Run the tests.
4. Commit.
5. Repeat.

If the tests go red, revert to the last commit instead of debugging a large half-finished edit.

## Common smells and moves

| Smell | Move |
|---|---|
| Long function | Extract Function, Replace Temp with Query |
| Duplicated code | Extract Function, then Pull Up Method or a shared helper |
| Long parameter list | Introduce Parameter Object |
| Feature envy (a method uses another class's data more than its own) | Move Function |
| Switch on a type code repeated in several places | Replace Conditional with Polymorphism |
| Primitive obsession (strings for money, emails, IDs) | Replace Primitive with Value Object |
| Deep nesting | Guard clauses, Decompose Conditional |
| Shotgun surgery (one change touches many files) | Move Function / Combine into Class |

## Larger restructurings

- Strangler fig: put the new structure beside the old one, route callers over one by one, and delete the old code when nothing calls it.
- Branch by abstraction: introduce an interface in front of the part to replace, switch implementations behind it, remove the interface if it no longer earns its place.
- Parallel change (expand, migrate, contract) for public signatures used by other teams.

Keep these on the main branch in small merged steps, not in a long-lived branch that diverges for weeks.

## Rules

- Never mix refactoring and behaviour change in one commit; reviewers cannot tell which lines change behaviour.
- Formatting-only commits go separately too, and can be listed in `.git-blame-ignore-revs`.
- Measure before "refactoring for performance"; that is optimisation, with different rules.

## Pitfalls

- Renaming via text search and replace across a dynamic language codebase without tests.
- Extracting abstractions for one caller "in case" a second appears.
- Static analysis (SonarQube, CodeClimate) scores treated as the goal.

Commits from each step follow git-commits. Characterisation and unit tests follow unit-testing, the review of the result goes through code-review, and optimisation work belongs to performance-profiling.
