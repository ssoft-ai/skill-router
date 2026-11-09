# Accessibility audit

Apply this skill when a page or a flow has to be checked for barriers to people using a keyboard, a screen reader, magnification or voice control.

## Target

Audit against WCAG 2.2 level AA unless the request names another level. Report each barrier with the success criterion number (for example 1.4.3 Contrast, 2.4.7 Focus Visible, 4.1.2 Name, Role, Value), where it occurs, who it affects and the fix.

## Steps

1. Automated pass: run axe DevTools or Lighthouse on each template, and `pa11y-ci` over the sitemap if there are many pages. Automated tools find roughly a third of the problems; treat a clean run as a starting point.
2. Keyboard pass: unplug the mouse. Tab through the whole flow. Every interactive element must be reachable, operable with Enter or Space, show a visible focus ring, and follow a logical order. Escape closes dialogs and returns focus to the trigger.
3. Screen reader pass: NVDA with Firefox on Windows, VoiceOver with Safari on macOS and iOS, TalkBack on Android. Navigate by headings (H), landmarks and form fields. Listen for unlabeled buttons ("button, button"), missing alt text and announcements of live regions.
4. Visual pass: check text contrast (4.5:1 normal, 3:1 large text and UI components), zoom to 400% for reflow, and turn on Windows High Contrast / forced colors.
5. Write the findings table.

## Findings table

| # | Criterion | Location | Barrier | Fix | Severity |
|---|---|---|---|---|---|
| 1 | 1.1.1 | product card image | decorative image announced as filename | `alt=""` | low |
| 2 | 2.1.1 | date picker | cannot open without mouse | use native `input type=date` or add key handlers | blocker |
| 3 | 4.1.2 | icon button "trash" | no accessible name | `aria-label="Delete item"` | high |

## Rules of thumb

- Native elements beat ARIA. The first rule of ARIA is not to use it when a native element exists.
- `aria-hidden="true"` on a focusable element is always a bug.
- Every `img` has `alt`; decorative ones have an empty `alt`.
- Errors in forms are linked to the field with `aria-describedby` and announced.
- Motion: respect `prefers-reduced-motion`.
- Do not convey state by colour alone; add an icon or text.

## Pitfalls

- Custom select and combobox widgets are the most common source of blockers; check them against the ARIA Authoring Practices pattern.
- Single-page app route changes do not move focus or announce the new page title unless the code does it.
- Skip links that point at an element without `tabindex="-1"` do nothing in some browsers.

Error messages and field-level validation are covered by form-validation. Layout fixes found during the audit go through css-layout, and the general front-end rules through web-development.
