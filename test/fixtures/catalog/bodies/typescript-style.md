# TypeScript style

Apply this skill when TypeScript code or a `tsconfig.json` is written, changed or reviewed.

## Compiler settings

Start from `"strict": true` and add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `noFallthroughCasesInSwitch` for new projects. Use `"module": "NodeNext"` or `"bundler"` resolution to match the runtime. Run `tsc --noEmit` in CI even when a bundler (esbuild, SWC, Vite) does the transpiling, because those tools strip types without checking them.

Lint with typescript-eslint using the type-aware configs (`recommendedTypeChecked`), and format with Prettier or Biome.

## Types

- Prefer `unknown` to `any`. `any` switches off checking for everything it touches; if it is unavoidable, isolate it in one function and add a comment.
- Model alternatives as discriminated unions, not optional fields that must be set together:
  ```ts
  type Result =
    | { kind: "ok"; value: Invoice }
    | { kind: "error"; code: "NOT_FOUND" | "FORBIDDEN" };
  ```
- Exhaustive `switch` with a `never` check in the default branch so a new variant fails to compile.
- `type` aliases for unions and mapped types, `interface` for object shapes that are extended; pick one convention per codebase.
- Use `as const` and `satisfies` instead of widening casts. Avoid `as` assertions and non-null `!` except right after a check the compiler cannot see.
- Branded types (`type UserId = string & { readonly __brand: "UserId" }`) when mixing up IDs is a real risk.
- Utility types (`Pick`, `Omit`, `Partial`, `Readonly`, `ReturnType`) over copy-pasted shapes.

## Narrowing

Use `typeof`, `in`, `instanceof`, discriminant checks and user-defined type guards (`function isInvoice(x: unknown): x is Invoice`). Data from outside - `JSON.parse`, `fetch`, `process.env` - is `unknown` until validated by a schema library such as Zod, Valibot or io-ts.

## Module boundaries

- Named exports; avoid default exports so renames are tracked.
- Each package or folder exposes a public surface through an `index.ts`; do not import from another module's internals (`../billing/internal/calc`). Enforce with ESLint `no-restricted-imports` or project references.
- `import type` for type-only imports (`verbatimModuleSyntax`).
- No circular imports; `madge --circular` finds them.

## Errors

- Throw `Error` subclasses with a `cause`, never strings.
- In `catch (err)`, `err` is `unknown`; narrow before reading `.message`.
- For expected failures (validation, not found), return a result union instead of throwing.
- Await every promise or explicitly mark it with `void`; enable `@typescript-eslint/no-floating-promises`.

## Pitfalls

- Enums with numeric values that serialise as numbers; prefer string literal unions.
- `Object.keys` returning `string[]`, not `keyof T`.
- Declaration merging surprises in global `.d.ts` files.

React-specific patterns live in react-components. Restructuring follows refactoring, and the review goes through code-review.
