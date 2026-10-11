# Tabs: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

## Markup

```html
<div ndTabs defaultValue="account">
  <div ndTabsList aria-label="Settings">
    <button ndTabsTrigger value="account">Account</button>
    <button ndTabsTrigger value="password">Password</button>
  </div>
  <div ndTabsContent value="account">…</div>
  <div ndTabsContent value="password">…</div>
</div>
```

## Parts, roles and attributes

| Part        | Selector                | Role       | ARIA attributes                                    | Data attributes                                   |
| ----------- | ----------------------- | ---------- | -------------------------------------------------- | ------------------------------------------------- |
| Tabs        | `[ndTabs]`              |            |                                                    | `data-orientation`                                |
| TabsList    | `[ndTabsList]`          | `tablist`  | `aria-orientation`                                 | `data-orientation`                                |
| TabsTrigger | `button[ndTabsTrigger]` | `tab`      | `aria-selected`, `aria-controls`, `id`, `tabindex` | `data-state`, `data-disabled`, `data-orientation` |
| TabsContent | `[ndTabsContent]`       | `tabpanel` | `aria-labelledby`, `id`, `tabindex`, `hidden`      | `data-state`, `data-orientation`                  |

- **Tabs**: `value` is a `model()` holding the selected tab's value, with
  `defaultValue`. `orientation` is `horizontal` (default) or `vertical`.
  `activationMode` is `automatic` (default: moving focus selects) or
  `manual` (`Enter` or `Space` selects).
- **TabsList** names the set with `aria-label` or `aria-labelledby`.
- **TabsTrigger** has a required `value` and a `disabled` input. Only the
  selected tab is in the tab order. Each trigger controls the panel with
  the same `value`. `data-state` is `active` or `inactive`.
- **TabsContent** has a required `value`. It is labelled by its trigger and
  has `tabindex="0"`, so a panel with no focusable content can still be
  reached. Inactive panels have the `hidden` attribute and stay in the
  document, so they render on the server.
- Before the first render a `defaultValue` selects its tab, so the server
  renders the right panel.

## Keyboard map

| Key                       | Action                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Tab`                     | Moves focus into the tab list, to the selected tab; then to the active panel.                             |
| `ArrowRight`, `ArrowLeft` | In a horizontal list, moves focus to the next or previous enabled tab, wrapping; selects it if automatic. |
| `ArrowDown`, `ArrowUp`    | In a vertical list, moves focus to the next or previous enabled tab, wrapping; selects it if automatic.   |
| `Home`                    | Moves focus to the first enabled tab; selects it if automatic.                                            |
| `End`                     | Moves focus to the last enabled tab; selects it if automatic.                                             |
| `Enter`, `Space`          | Selects the focused tab.                                                                                  |

## Focus behavior

- The selected tab is the list's only tab stop; arrow keys move focus
  without leaving the list, and disabled tabs are skipped.
- Clicking a tab focuses and selects it.

## RTL behavior

In a horizontal list in a right-to-left layout, `ArrowLeft` moves to the
next tab and `ArrowRight` to the previous one. Direction comes from the
nearest `dir` attribute.
