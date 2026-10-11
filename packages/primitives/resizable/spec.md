# Resizable: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)

## Markup

Panels and handles alternate inside a group. Each handle resizes the panel
before it and the panel after it.

```html
<div ndResizablePanelGroup orientation="horizontal">
  <div ndResizablePanel [defaultSize]="30" [minSize]="20">Sidebar</div>
  <div ndResizableHandle aria-label="Resize sidebar"></div>
  <div ndResizablePanel>Content</div>
</div>
```

## Parts, roles and attributes

| Part                | Selector                  | Role        | ARIA attributes                                                                                    | Data attributes                  |
| ------------------- | ------------------------- | ----------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| ResizablePanelGroup | `[ndResizablePanelGroup]` |             |                                                                                                    | `data-orientation`               |
| ResizablePanel      | `[ndResizablePanel]`      |             | `id`                                                                                               | `data-size`                      |
| ResizableHandle     | `[ndResizableHandle]`     | `separator` | `aria-orientation`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-controls`, `tabindex` | `data-dragging`, `data-disabled` |

- **ResizablePanelGroup** lays its panels out in a row (`horizontal`, the
  default) or a column (`vertical`). `sizes` is a `model()` of the panels'
  sizes, in percent of the group, in document order. `keyboardStep` (default
  `10`) is how far an arrow key moves a handle, in percent.
- **ResizablePanel** has `defaultSize`, `minSize` (default `0`) and
  `maxSize` (default `100`), in percent. Panels without a `defaultSize`
  share the space the others leave. The primitive sets its `flex` style
  from its size, which `data-size` repeats.
- **ResizableHandle** is a focusable separator between two panels. Its
  `aria-orientation` is the line's: `vertical` in a horizontal group.
  `aria-valuenow` is the size of the panel before it, which
  `aria-controls` points at, between that panel's `minSize` and `maxSize`.
  Name it with `aria-label` when the panels have no headings to point at
  with `aria-labelledby`. `disabled` stops it moving and takes it out of
  the tab order. While a pointer drags it, it has `data-dragging`.
- Sizes are set before the first render, so the server renders the layout.

## Keyboard map

| Key                       | Action                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `Tab`                     | Moves focus to the next handle, in document order.                                         |
| `ArrowLeft`, `ArrowRight` | In a horizontal group, moves the focused handle toward that side by `keyboardStep`.        |
| `ArrowUp`, `ArrowDown`    | In a vertical group, moves the focused handle up or down by `keyboardStep`.                |
| `Home`                    | Shrinks the panel before the handle to its `minSize`, as far as the panel after it allows. |
| `End`                     | Grows the panel before the handle to its `maxSize`, as far as the panel after it allows.   |

## Focus behavior

- Handles are in the tab order unless disabled; panels aren't.
- Dragging a handle with the pointer doesn't move focus.

## RTL behavior

In a horizontal group in a right-to-left layout, the panels run from right
to left, so `ArrowLeft` grows the panel before the handle and `ArrowRight`
shrinks it, and dragging follows the pointer. Direction comes from the
nearest `dir` attribute.
