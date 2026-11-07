# React components

Apply this skill when a React component is written, grows too large, or its state needs to move up or down the tree.

## Shape of a component

- One component per file, named in PascalCase, default-exported only if the project already does so.
- Props are the public interface. Type them (TypeScript `interface` or PropTypes) and keep the list short; more than about seven props usually means two components.
- Derive what you can during render. If a value can be computed from props or other state, it is not state.
- Keep effects for synchronising with something outside React: a subscription, a timer, the DOM. Data that only depends on props does not need `useEffect`.

## Steps for splitting a component

1. Read the JSX and mark the visual blocks. Each block with its own state or its own data fetch is a candidate.
2. Extract the leaf blocks first; pass data down through props and events up through callbacks (`onSelect`, `onChange`).
3. If two siblings need the same state, lift it to their nearest common parent. If many distant components need it, use a context or the store (Redux Toolkit, Zustand) the project already uses - do not add a second one.
4. Move reusable logic into a custom hook (`useDebouncedValue`, `usePagination`). A hook name starts with `use` and follows the rules of hooks.
5. Run the tests and the app after each extraction, not at the end.

## Example

```tsx
type Props = { items: Item[]; onPick: (id: string) => void };

export function ItemList({ items, onPick }: Props) {
  if (items.length === 0) return <EmptyState />;
  return (
    <ul>
      {items.map((it) => (
        <ItemRow key={it.id} item={it} onPick={onPick} />
      ))}
    </ul>
  );
}
```

The `key` is a stable ID, never the array index when the list can reorder.

## Rendering cost

Do not sprinkle `React.memo`, `useMemo` and `useCallback` everywhere. Measure first with the React DevTools Profiler; memoise only the component whose re-render shows up in the flame chart. With React 19 and the compiler enabled much of this is automatic.

## Pitfalls

- Stale closures: an effect or callback that reads state without listing it in the dependency array sees an old value. Trust the `react-hooks/exhaustive-deps` lint rule.
- Controlled vs uncontrolled inputs: switching a field from `value={undefined}` to a string triggers a warning and lost input.
- Fetching in `useEffect` without an abort signal causes race conditions when props change quickly; prefer the project's data library (TanStack Query, SWR).
- Context that holds a frequently changing object re-renders every consumer.

Tests for the component go through react-testing. Layout of what it renders belongs to css-layout, and a larger restructuring with no behaviour change follows refactoring.
