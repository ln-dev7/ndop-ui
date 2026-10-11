# Sidebar: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

No single pattern: a sidebar is a collapsible region of the page, usually
holding a `nav`. Below the mobile breakpoint it opens as a modal dialog
([Dialog (modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)),
on a CDK overlay with a focus trap, as the Dialog primitive does
(ADR-0004, amendment 3).

## Markup

The provider holds the state; the sidebar's layout is the user's markup.

```html
<div ndSidebarProvider>
  <div ndSidebar collapsible="icon">
    <div ndSidebarGap></div>
    <div ndSidebarContainer aria-label="Main">
      <nav>…</nav>
    </div>
  </div>
  <main>
    <button ndSidebarTrigger><span class="sr-only">Toggle sidebar</span></button>
  </main>
</div>
```

## Parts, roles and attributes

| Part              | Selector                   | Role                         | ARIA attributes                       | Data attributes                                              |
| ----------------- | -------------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| SidebarProvider   | `[ndSidebarProvider]`      |                              |                                       | `data-state`, `data-mobile`                                  |
| Sidebar           | `[ndSidebar]`              |                              |                                       | `data-state`, `data-collapsible`, `data-side`, `data-mobile` |
| SidebarGap        | `[ndSidebarGap]`           |                              | `aria-hidden`                         |                                                              |
| SidebarContainer  | `[ndSidebarContainer]`     | `region`, `dialog` on mobile | `id`, `aria-modal`, `inert`, `hidden` | `data-mobile`, `data-state`                                  |
| SidebarTrigger    | `button[ndSidebarTrigger]` |                              | `aria-expanded`, `aria-controls`      | `data-state`                                                 |
| SidebarRail       | `button[ndSidebarRail]`    |                              | `aria-hidden`, `tabindex`             |                                                              |
| SidebarMenuButton | `[ndSidebarMenuButton]`    |                              | `aria-current`                        | `data-active`                                                |

- **SidebarProvider**: `open` is a `model()` for the desktop sidebar,
  with `defaultOpen` (default `true`); `openMobile` is a `model()` for the
  mobile one. `mobileQuery` (default `(max-width: 767.98px)`) is the CSS
  media query below which it's mobile, watched with the CDK's
  `BreakpointObserver`; the server renders the desktop layout. `shortcut`
  (default `b`) toggles the sidebar with `Ctrl` or `⌘`; `null` turns it
  off. `data-state` is `expanded` or `collapsed`.
- **Sidebar**: `side` is `start` (default) or `end`, logical so it follows
  the text direction. `collapsible` is `offcanvas` (default: it slides out
  of view), `icon` (it narrows to its icons) or `none`.
  `data-collapsible` repeats it while collapsed.
- **SidebarGap** keeps the sidebar's room in the page's flow; it's
  decorative.
- **SidebarContainer** holds the sidebar's content. It's a landmark,
  `role="region"`, so a header or footer beside its `nav` is in one too;
  name it with `aria-label`. On desktop, while
  collapsed off-canvas, it's `inert`, so its links leave the tab order as
  they leave the screen. On mobile it has the `hidden` attribute while
  closed; open, it moves into an overlay at its side with a backdrop and
  becomes a modal dialog: `role="dialog"`, `aria-modal`, a focus trap,
  `Escape` and a backdrop click close it, and focus returns to what opened
  it.
- **SidebarTrigger** is a native button that toggles the sidebar: the
  desktop one, or the mobile one on mobile. Name it with text, visible or
  `sr-only`.
- **SidebarRail** is a thin strip along the sidebar's edge that toggles it
  with the pointer. It repeats the trigger, so it's out of the tab order
  and hidden from assistive technology.
- **SidebarMenuButton**: `active` marks the current page with
  `aria-current="page"` and `data-active`. On mobile, following a link
  closes the sidebar.

## Keyboard map

| Key      | Action                                                            |
| -------- | ----------------------------------------------------------------- |
| `Ctrl+b` | Toggles the sidebar (`⌘B` on a Mac), unless `shortcut` is `null`. |
| `Enter`  | On the trigger, toggles the sidebar.                              |
| `Escape` | Closes the mobile sidebar and returns focus.                      |
| `Tab`    | Moves through the sidebar's content; on mobile, it stays inside.  |

## Focus behavior

- Opening the mobile sidebar focuses its first focusable element; closing
  it returns focus to the trigger, or wherever focus was before.
- Collapsing the desktop sidebar off-canvas while focus is inside moves
  focus to the trigger that collapsed it.

## RTL behavior

`start` and `end` are logical: the `start` sidebar is on the right in
right-to-left layouts, on desktop and on mobile.
