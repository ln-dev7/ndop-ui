# Collapsible: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Disclosure (Show/Hide)](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)

## Parts, roles and attributes

| Part               | Selector                       | Role | ARIA attributes                  | Data attributes               |
| ------------------ | ------------------------------ | ---- | -------------------------------- | ----------------------------- |
| Collapsible        | `[ndCollapsible]`              |      |                                  | `data-state`, `data-disabled` |
| CollapsibleTrigger | `button[ndCollapsibleTrigger]` |      | `aria-expanded`, `aria-controls` | `data-state`, `data-disabled` |
| CollapsibleContent | `[ndCollapsibleContent]`       |      |                                  | `data-state`                  |

- **Collapsible**: `open` is a `model()` (two-way `[(open)]`); unbound, it
  starts from the `defaultOpen` input (default `false`). `disabled`
  (default `false`) stops the trigger from toggling.
- **CollapsibleTrigger** (a native `button`, so its role and keyboard
  activation are the browser's): toggles `open` on click;
  `aria-expanded` mirrors `open`; `aria-controls` points at the content's
  id; `disabled` while the collapsible is.
- **CollapsibleContent**: has an id (its own, or a generated one) and the
  `hidden` attribute while closed, which removes it from the accessibility
  tree and the tab order.
- `data-state` is `open` or `closed` on every part.
- Unlike overlays, the content is in the page: the open state renders on
  the server too, so a collapsible that starts open is open before
  hydration.

## Keyboard map

| Key     | Action                                      |
| ------- | ------------------------------------------- |
| `Enter` | On the trigger, shows or hides the content. |
| `Space` | On the trigger, shows or hides the content. |

## Focus behavior

- Focus stays on the trigger when the content shows or hides.
- Shown content joins the tab order after the trigger; hidden content
  leaves it.

## RTL behavior

Nothing mirrors.
