# Avatar: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern covers an avatar. It is an image, with the
[`img` element's](https://www.w3.org/WAI/tutorials/images/) own semantics,
and a fallback shown until the image loads, or when it fails.

## Parts, roles and attributes

| Part           | Selector             | Role | ARIA attributes | Data attributes |
| -------------- | -------------------- | ---- | --------------- | --------------- |
| Avatar         | `[ndAvatar]`         |      |                 | `data-status`   |
| AvatarImage    | `img[ndAvatarImage]` |      | `aria-hidden`   | `data-status`   |
| AvatarFallback | `[ndAvatarFallback]` |      | `aria-hidden`   | `data-status`   |

- `data-status` is `loading`, `loaded` or `error` on every part, so styles
  show the image once it has loaded and the fallback otherwise.
- **AvatarImage** is a native `img`: its `alt` names the avatar. While it
  isn't loaded, it's `aria-hidden`, so assistive technology reads the
  fallback instead of a broken image.
- **AvatarFallback** (initials or an icon) is `aria-hidden` once the image
  has loaded, so the avatar is announced once.
- On the server, and until the browser reports the image, the status is
  `loading`. An image that loaded before hydration is detected then.

## Keyboard map

| Key | Action |
| --- | ------ |

An avatar is not focusable and has no keyboard behavior.

## Focus behavior

- The avatar never receives focus and never changes focus.

## RTL behavior

Nothing mirrors.
