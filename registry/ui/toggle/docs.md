---
keywords: toggle, toggle button, pressed, bold, italic, formatting, toolbar
---

A toggle is a button that stays pressed or released, such as Bold in a
text editor. It's announced with its pressed state, comes in a default
and an outline style and three sizes, and binds with `[(pressed)]`. For
several related toggles, such as formatting or alignment, use a Toggle
Group, which adds arrow-key navigation.

## Do

- Give an icon-only toggle an `aria-label`, such as "Toggle bold".
- Keep the same name in both states.

## Don't

- Don't use a toggle for an on/off setting; use a Switch.
- Don't use it to trigger an action; use a Button.
