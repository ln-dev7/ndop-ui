# Tooltip: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)

## Markup

Same overlay convention as Dialog's `spec.md`.

```html
<ng-container ndTooltip>
  <button ndTooltipTrigger aria-label="Delete">…</button>
  <ng-template ndTooltipPortal>
    <div ndTooltipContent>Delete permanently</div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part           | Selector                       | Role      | ARIA attributes    | Data attributes                         |
| -------------- | ------------------------------ | --------- | ------------------ | --------------------------------------- |
| Tooltip        | `[ndTooltip]`                  |           |                    |                                         |
| TooltipTrigger | `[ndTooltipTrigger]`           |           | `aria-describedby` | `data-state`                            |
| TooltipPortal  | `ng-template[ndTooltipPortal]` |           |                    |                                         |
| TooltipContent | `[ndTooltipContent]`           | `tooltip` |                    | `data-state`, `data-side`, `data-align` |

- **Tooltip**: `open` model and `defaultOpen` input; `openDelay` (ms,
  default `700`) and `closeDelay` (ms, default `300`).
- **TooltipTrigger**: any focusable element. While open, the content's id
  is added to its `aria-describedby`, keeping ids the user set there.
- **TooltipContent**: `role="tooltip"`; never focusable. `side`, `align` and
  `sideOffset` work as in Popover's `spec.md`, except that `side` defaults to
  `'top'`, as in Radix and shadcn.
- Opens: when the pointer enters the trigger, after `openDelay`; when the
  trigger receives keyboard focus, at once.
- Closes: when the pointer leaves both trigger and content, after
  `closeDelay`; when the trigger loses focus; on Escape. Keeping the pointer
  over the content keeps it open, as WCAG 1.4.13 (hoverable) requires.
- Server rendering: never open on the server.

## Keyboard map

| Key      | Action                                                              |
| -------- | ------------------------------------------------------------------- |
| `Tab`    | Focusing the trigger shows the tooltip; moving focus away hides it. |
| `Escape` | Hides the tooltip without moving focus.                             |

## Focus behavior

- The tooltip never takes focus; focus stays on the trigger.

## RTL behavior

As in Popover's `spec.md`: `start` and `end` sides and alignments swap in
RTL.
