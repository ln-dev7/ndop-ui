---
keywords: placeholder, loading, shimmer, ghost
---

A skeleton is a placeholder in the shape of content that's still
loading, so the page doesn't jump when it arrives. Size it with classes.
It's hidden from assistive technology; mark the region that's loading
with `aria-busy="true"` so screen readers wait for the real content.

## Do

- Match the size and shape of what's coming: lines of text, an avatar, an
  image.
- Set `aria-busy="true"` on the container while it loads, and remove it
  when the content is in.
- Use `@defer` or a `resource()`'s loading state to swap skeletons for
  content.

## Don't

- Don't show skeletons for content that loads in a blink; it flickers.
- Don't put text or controls inside a skeleton.
