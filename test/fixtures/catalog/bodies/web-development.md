# Web development

Apply this skill whenever a page, a component or a stylesheet that runs in the browser is created or changed, and no narrower front-end skill covers the task alone.

## Scope and routing

This is the umbrella for front-end work. It sets the ground rules every page shares and hands the specialised parts to its children:

| Task | Skill |
|---|---|
| Splitting a component, lifting state, writing hooks | react-components |
| Layout that overlaps or breaks on a phone | css-layout |
| Keyboard, contrast, screen readers | accessibility-audit |
| Field validation and error messages | form-validation |

Server endpoints the page calls belong to api-design, not here.

## Working steps

1. Reproduce the current state in a real browser before you change anything. Open DevTools, note console errors and the network waterfall.
2. Find the entry point: the route, the template or the bundle chunk that renders the page. In a single-page app check the router config; in a server-rendered site check the view.
3. Make the change in the smallest unit that owns it - a component, a CSS module, a utility function - rather than patching the page from outside.
4. Check the change at three widths (360 px, 768 px, 1280 px) and in at least two engines, Chromium and Firefox or WebKit.
5. Run the build (`npm run build` or the project's equivalent) and read the bundle size report; a new dependency that adds 80 kB gzip needs a reason.
6. Run the test suite and lint (ESLint, Stylelint) before you request a review.

## Rules

- Semantic HTML first: `button` for actions, `a` for navigation, headings in order. A `div` with a click handler is a defect.
- No inline styles for layout; use the project's CSS approach (modules, BEM, Tailwind utilities) consistently.
- Images carry `width`, `height` and `alt`; large ones use `srcset` and `loading="lazy"`.
- Fetch calls handle loading, empty and error states explicitly.
- Never ship `console.log` debugging or commented-out markup.

## Performance budget

Watch the Core Web Vitals: LCP under 2.5 s, CLS under 0.1, INP under 200 ms on a mid-range phone profile in Lighthouse. A regression in any of them is a finding in its own right, not a cosmetic note.

## Pitfalls

- Caching: a changed asset without a content hash in its filename will be served stale by the CDN.
- Polyfills: check the browserslist target before using a new API such as `structuredClone`.
- Third-party scripts (analytics, chat widgets) block the main thread; load them `async` or defer them.
- Hydration mismatches in SSR frameworks usually come from dates or random IDs rendered differently on server and client.

When the change is done, the pull request goes through code-review like any other change.
