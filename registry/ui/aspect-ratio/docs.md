---
keywords: ratio, 16:9, video, image, media, responsive
---

Aspect Ratio keeps its content at a width-to-height ratio as the width
changes, for images, video and maps. It sets the CSS `aspect-ratio`
property from `ratio`, such as `16 / 9`. Size the media inside to fill
it.

## Do

- Put an `img` or `video` inside with `class="size-full object-cover"`.
- Give images a meaningful `alt`, or `alt=""` when they're decorative.
- Use it to stop the page shifting while media loads.

## Don't

- Don't put text that can grow inside it; it will overflow.
- Don't use it for things with a natural size, such as icons.
