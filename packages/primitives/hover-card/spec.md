# Hover Card: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

None. A hover card previews what's behind a link for sighted pointer and
keyboard users, such as a profile behind a username. It adds nothing a
screen reader user needs: the link itself must say where it goes, and the
card isn't announced or reachable with Tab. Use a Popover for content
everyone must reach.

## Markup

The Tooltip convention: a root on an `ng-container`, the content in an
`ng-template` local view, shown as a native hint popover. It composes the Tooltip primitive's root, so it
shares its delays and positioning.

```html
<ng-container ndHoverCard>
  <a ndHoverCardTrigger href="/ada">@ada</a>
  <ng-template ndHoverCardPortal>
    <div ndHoverCardContent>Ada Lovelace, first programmer.</div>
  </ng-template>
</ng-container>
```

## Parts, roles and attributes

| Part             | Selector                         | Role | ARIA attributes | Data attributes                         |
| ---------------- | -------------------------------- | ---- | --------------- | --------------------------------------- |
| HoverCard        | `[ndHoverCard]`                  |      |                 |                                         |
| HoverCardTrigger | `[ndHoverCardTrigger]`           |      |                 | `data-state`                            |
| HoverCardPortal  | `ng-template[ndHoverCardPortal]` |      |                 |                                         |
| HoverCardContent | `[ndHoverCardContent]`           |      |                 | `data-state`, `data-side`, `data-align` |

- **HoverCard**: `open` is a `model()` with `defaultOpen`.
  `openDelay` (default `700` ms) and `closeDelay` (default `300` ms).
- **HoverCardTrigger**, usually a link: hovering it, or focusing it with
  the keyboard, opens the card after `openDelay`; leaving it, or blur,
  closes it after `closeDelay`.
- **HoverCardContent**: stays open while the pointer is over it. Its
  `side` (default `bottom`), `align` (default `center`) and
  `sideOffset` (default `4`) place it, flipping to fit the viewport;
  `data-side` and `data-align` say where it ended up. It has no role and
  isn't referenced by the trigger: it repeats the link's destination. It
  closes when the trigger loses focus, so Tab never reaches it.
- Never rendered open on the server.

## Keyboard map

| Key      | Action                                                                     |
| -------- | -------------------------------------------------------------------------- |
| `Tab`    | Focusing the trigger opens the card after the delay; leaving it closes it. |
| `Escape` | Closes the card without moving focus.                                      |

## Focus behavior

- The card never takes focus; focus stays on the trigger.

## RTL behavior

`start` and `end` sides are logical and swap in right-to-left layouts.

## Native top-layer behavior

The popup uses `popover="hint"` and native `toggle` events synchronize its
open state. Hint popovers keep an enclosing auto popover open. Where hint mode is unavailable, manual mode with Escape handling supplies the same behavior.
Content remains in its declaring Angular view. Nothing opens on the server;
bound initial state applies after hydration. Positioning uses CSS anchors where
supported, with JavaScript flipping/shifting and a fallback that tracks resize,
scroll and disconnected anchors. Closing cleans up listeners and observers.
`data-state` supports native discrete display/overlay transitions and
`@starting-style`; reduced motion is respected. See ADR-0032.
