---
keywords: scroll, scrollbar, overflow, scrollable, list
---

Scroll Area is a region that scrolls inside a fixed size, with thin
scrollbars in the theme's border color. It uses the browser's own
scrolling, so touch, the mouse wheel and the keyboard all work, and it
can take focus so keyboard users can scroll it with the arrow keys. Choose
`vertical`, `horizontal` or `both`.

## Do

- Give it a height (or width, when horizontal), such as `class="h-72"`.
- Name it with `aria-label` when it holds a section of the page rather
  than a single list.
- Keep focusable controls inside it reachable; scrolling follows focus.

## Don't

- Don't nest scroll areas in the same direction.
- Don't use it to hide content that should be visible; let the page
  scroll.
