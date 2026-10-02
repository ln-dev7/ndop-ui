# Popover: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No APG pattern covers popovers. This follows non-modal dialog semantics: the
WAI-ARIA [dialog role](https://www.w3.org/TR/wai-aria-1.2/#dialog) without
`aria-modal` or a focus trap.

## Markup

Same overlay convention as Dialog's `spec.md`.

```html
<ng-container ndPopover>
  <button ndPopoverTrigger>Filters</button>
  <ng-template ndPopoverPortal>
    <div ndPopoverContent side="bottom" align="start" aria-label="Filters">
      …
      <button ndPopoverClose>Done</button>
    </div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part           | Selector                       | Role     | ARIA attributes                                   | Data attributes                         |
| -------------- | ------------------------------ | -------- | ------------------------------------------------- | --------------------------------------- |
| Popover        | `[ndPopover]`                  |          |                                                   |                                         |
| PopoverTrigger | `[ndPopoverTrigger]`           |          | `aria-haspopup`, `aria-expanded`, `aria-controls` | `data-state`                            |
| PopoverPortal  | `ng-template[ndPopoverPortal]` |          |                                                   |                                         |
| PopoverContent | `[ndPopoverContent]`           | `dialog` |                                                   | `data-state`, `data-side`, `data-align` |
| PopoverClose   | `[ndPopoverClose]`             |          |                                                   |                                         |

- **Popover**: `open` model and `defaultOpen` input, as in Dialog.
- **PopoverTrigger** (a `button`): toggles `open`;
  `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls` while open.
- **PopoverContent**: `role="dialog"`, `tabindex="-1"`. Inputs:
  - `side`: `'top' | 'bottom' | 'start' | 'end'`, default `'bottom'`;
    `start` and `end` are logical, so they swap in RTL;
  - `align`: `'start' | 'center' | 'end'`, default `'center'`;
  - `sideOffset`: distance from the trigger in pixels, default `4`.
    When the preferred side doesn't fit, the content flips to the opposite
    side. `data-side` and `data-align` report where it actually is, using the
    same logical values.
    The user names the content with `aria-label` or `aria-labelledby`.
- **PopoverClose** (a `button`): closes the popover.
- Pointer down outside the content and trigger closes the popover.
- Server rendering: as in Dialog, never open on the server.

## Keyboard map

| Key           | Action                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Escape`      | Closes the popover and returns focus to the trigger.                                                                      |
| `Tab`         | Moves focus through the content; past the last element, the popover closes and focus moves to what follows the trigger.   |
| `Shift + Tab` | Moves focus backwards through the content; before the first element, the popover closes and focus returns to the trigger. |

The overlay is rendered at the end of the document, so Ndop moves focus at
the content's edges itself; otherwise tabbing out would skip the page
content after the trigger.

## Focus behavior

- On open: focus moves to the first focusable element in the content, or to
  the content element.
- Focus is not trapped.
- On close with Escape or PopoverClose: focus returns to the trigger.
- On close because focus or a pointer left: focus stays where the user put
  it.

## RTL behavior

`side="start"` and `side="end"` place the content on the inline start and
end of the trigger, which swap in RTL; `align="start"` and `align="end"`
swap likewise.
