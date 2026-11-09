# CSS layout

Apply this skill when elements on a page overlap, wrap in the wrong place, overflow horizontally, or the layout falls apart on a small screen.

## Choosing the tool

| Need | Use |
|---|---|
| Items in one row or one column, distributing space | flexbox |
| Two-dimensional placement, aligned rows and columns | grid |
| A card list that fills the width | `grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr))` |
| Component that adapts to its container, not the viewport | container queries (`@container`) |
| Overlay, badge, tooltip | `position: absolute` inside a `position: relative` parent |

Absolute positioning and magic pixel offsets (`top: 37px`) are for overlays only, never for page flow.

## Steps

1. Reproduce the breakage in DevTools device mode at the width where it happens. Turn on the flexbox and grid overlays.
2. Find the element that overflows: add `outline: 1px solid red` to `*` temporarily, or use the "scrollable" badge in the Elements panel.
3. Check the usual culprits: a fixed `width`, a long unbreakable word or URL, an image without `max-width: 100%`, a flex child with the default `min-width: auto`.
4. Fix with intrinsic sizing - `min-width: 0` on flex children, `overflow-wrap: anywhere` on text, `minmax(0, 1fr)` in grid tracks.
5. Write the base styles mobile-first and add `min-width` media queries for larger breakpoints.
6. Recheck at 320 px, 768 px and 1440 px, and with the browser zoomed to 200%.

## Spacing rules

- Use logical properties: `margin-inline`, `padding-block`, `inset-inline-start`. They flip correctly for right-to-left languages.
- Use `gap` for space between flex or grid items instead of margins on children.
- Take sizes from the design tokens or a spacing scale (`--space-2`, `--space-4`); `rem` for type and spacing, `%` or `fr` for widths.
- Avoid `100vh` on mobile; `100dvh` accounts for the browser's address bar.

## Pitfalls

- `z-index` wars: a new stacking context (from `transform`, `opacity < 1`, `filter`) traps children. Fix the context, do not raise the number to 9999.
- Margin collapse between block siblings surprises people; flex and grid containers do not collapse margins.
- `float` layouts in legacy code: replace them with flexbox when you touch them, but not in the same commit as an unrelated fix.
- Subgrid support is good now, but check the browserslist target.

Focus order and visible focus outlines after a layout change are checked with accessibility-audit. Component boundaries come from react-components, and the general front-end workflow from web-development.
