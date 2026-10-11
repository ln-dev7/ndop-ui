# Navigation Menu: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/):
a list of links and buttons, each button showing a panel of links. It
doesn't use menu roles: a site's navigation is links, and screen readers
expect `menu` only for application menus.

## Markup

Each panel follows its button in the document (ADR-0004, amendment 5), so
Tab moves from the button into its links and the links are in the
server-rendered HTML.

```html
<nav ndNavigationMenu aria-label="Main">
  <ul ndNavigationMenuList>
    <li ndNavigationMenuItem>
      <button ndNavigationMenuTrigger>Docs</button>
      <div ndNavigationMenuContent>
        <a ndNavigationMenuLink href="/docs/install">Installation</a>
      </div>
    </li>
    <li ndNavigationMenuItem>
      <a ndNavigationMenuLink href="/blog" active>Blog</a>
    </li>
  </ul>
</nav>
```

## Parts, roles and attributes

| Part                  | Selector                          | Role | ARIA attributes                  | Data attributes               |
| --------------------- | --------------------------------- | ---- | -------------------------------- | ----------------------------- |
| NavigationMenu        | `[ndNavigationMenu]`              |      |                                  | `data-state`                  |
| NavigationMenuList    | `[ndNavigationMenuList]`          |      |                                  |                               |
| NavigationMenuItem    | `[ndNavigationMenuItem]`          |      |                                  | `data-state`                  |
| NavigationMenuTrigger | `button[ndNavigationMenuTrigger]` |      | `aria-expanded`, `aria-controls` | `data-state`, `data-disabled` |
| NavigationMenuContent | `[ndNavigationMenuContent]`       |      | `id`, `hidden`                   | `data-state`                  |
| NavigationMenuLink    | `a[ndNavigationMenuLink]`         |      | `aria-current`                   | `data-active`                 |

- **NavigationMenu** goes on a `nav` named with `aria-label`. `value` is a
  `model()` holding the open item's value, or `null`. `openDelay`
  (default `200` ms) is how long the pointer rests on a button before its
  panel opens; once one is open, moving to another button opens it at
  once. `closeDelay` (default `300` ms) is how long the panel stays after
  the pointer leaves its item. `data-state` is `open` while a panel is.
- **NavigationMenuList** goes on the `ul` of top-level items.
- **NavigationMenuItem** goes on each `li`. Its `value` defaults to a
  generated one.
- **NavigationMenuTrigger** is a native `button` that shows and hides its
  item's panel: a click toggles it, and the pointer opens it after the
  delay. It disables with `disabled`.
- **NavigationMenuContent** is its item's panel. It has the `hidden`
  attribute while closed and stays in the document. While open, the
  pointer over it keeps it open.
- **NavigationMenuLink**: `active` marks the current page with
  `aria-current="page"` and `data-active`. Following a link closes the
  panel.
- The panel closes when focus leaves the navigation, or on a click outside
  it.

## Keyboard map

| Key                       | Action                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `Tab`                     | Moves focus through the buttons, top-level links and the open panel's links, in document order. |
| `Enter`, `Space`          | On a button, shows or hides its panel.                                                          |
| `ArrowDown`               | On a button, opens its panel and focuses its first link.                                        |
| `ArrowRight`, `ArrowLeft` | On a top-level button or link, moves focus to the next or previous one, wrapping.               |
| `Home`, `End`             | On a top-level button or link, moves focus to the first or last one.                            |
| `Escape`                  | Closes the open panel and returns focus to its button.                                          |

## Focus behavior

- Opening a panel with `Enter`, `Space` or a click keeps focus on the
  button.
- Focus leaving the navigation closes the open panel.

## RTL behavior

In right-to-left layouts the top-level items run from right to left, so
`ArrowLeft` moves to the next one and `ArrowRight` to the previous one.
Direction comes from the nearest `dir` attribute.
