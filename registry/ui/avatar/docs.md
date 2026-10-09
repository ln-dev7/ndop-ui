---
keywords: profile picture, user, image, initials, photo, group
---

An avatar shows a user's picture, with a fallback such as their initials
until the image loads, or if it fails, so there's never a broken image.
The image's `alt` names the avatar; once it has loaded, the fallback is
hidden from screen readers, so the avatar is announced once. Avatars come
in three sizes, and a group overlaps them with a count of the rest.

## Do

- Give the image an `alt` with the person's name, or `alt=""` when their
  name is already next to it.
- Use initials or an icon as the fallback.
- Say an avatar badge's meaning in text too, such as an `sr-only`
  "Online".

## Don't

- Don't use an avatar as the only way to tell people apart.
- Don't put interactive controls inside it; wrap it in a link or button.
