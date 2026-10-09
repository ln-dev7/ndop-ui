---
keywords: slider, range, range slider, volume, price range, number, drag, track, thumb
---

A slider picks a number from a range by dragging a thumb along a track,
or a range with two thumbs, such as a price filter. Each thumb is a
`slider` with its own value, which the arrow keys change by a step and
Page Up and Page Down by ten; range thumbs can't pass each other.
Horizontal sliders run from the start side, so they mirror in
right-to-left layouts, and vertical ones run bottom to top.

## Do

- Name every thumb, such as "Minimum price" and "Maximum price".
- Show the value next to the slider, and set `valueText` when a number
  alone doesn't say it, such as "$40".

## Don't

- Don't use a slider when an exact value matters; use an Input of type
  number.
- Don't use a slider for a few distinct options; use a Radio Group.
