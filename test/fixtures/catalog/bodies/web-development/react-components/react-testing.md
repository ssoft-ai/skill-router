# React testing

Apply this skill when a test for a React component is written, or an existing component test fails intermittently.

## Principles

Test what the user perceives, not how the component is built. A test that reads internal state, calls instance methods or snapshots the whole DOM breaks on every refactor and proves little.

- Query by role and accessible name first: `getByRole('button', { name: /save/i })`. Fall back to `getByLabelText`, then `getByText`. `getByTestId` is the last resort.
- Drive the component with `@testing-library/user-event`, not `fireEvent`; `userEvent.setup()` once per test, then `await user.click(...)`, `await user.type(...)`.
- Mock the network, not the modules. Mock Service Worker (MSW) handlers return the JSON the real API would; the component's fetch code runs unchanged.
- One behaviour per test. The name says what the user does and sees: "shows an error when the email is taken".

## Steps

1. Render with the providers the component needs (router, query client, theme). Keep a `renderWithProviders` helper in the test utils.
2. Arrange the network with MSW `server.use(http.get('/api/items', ...))` for this test only.
3. Act through user events.
4. Assert with `findBy*` for anything that appears after an async update, and `queryBy*` plus `not.toBeInTheDocument()` for absence.
5. Run the file in watch mode (Vitest or Jest) until it passes, then run it ten times in a row (`--repeat` or a loop) to catch flakiness.

## Fixing a flaky test

| Symptom | Usual cause | Fix |
|---|---|---|
| "not wrapped in act(...)" warning | state update after the assertion finished | await a `findBy*` for the final state |
| passes alone, fails in the suite | shared mock or leaked timer | `afterEach(() => server.resetHandlers())`, `vi.useRealTimers()` |
| fails on CI only | slower machine, default 1000 ms timeout | wait on a visible state, not a fixed delay |
| random order dependence | module-level cache in the component | reset the cache in `beforeEach` |

Never fix flakiness with `setTimeout` or a bigger timeout alone.

## Checklist

- [ ] No `container.querySelector` in assertions
- [ ] No snapshot of more than a small, stable fragment
- [ ] Every mocked endpoint also has an error-path test
- [ ] Fake timers restored after use
- [ ] Test runs green in jsdom and, for layout-dependent cases, in Playwright component mode

General rules for isolated tests (naming, one assertion focus, no shared state) come from unit-testing. The component's structure itself is the subject of react-components. A test that fails on CI only may also point at caching in ci-pipelines.
