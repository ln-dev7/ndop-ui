---
keywords: navigation menu, navbar, nav, mega menu, site navigation, header menu, links
---

A navigation menu is a site's main navigation: links, and buttons that
show panels of more links below them. It uses no menu roles, as screen
readers expect for links, and each panel stays right after its button in
the page, so Tab moves into its links and they're in the server-rendered
HTML. A panel opens on click, Enter or Space, or when the pointer rests
on its button, and Escape closes it.

## Do

- Put it on a `nav` with an `aria-label`.
- Mark the link to the current page with `active`.
- Give top-level links `navigationMenuTriggerStyle` so they match the
  buttons.

## Don't

- Don't put actions or form fields in a panel; use Dropdown Menu or
  Popover.
- Don't hide the only link to an important page in a panel.
