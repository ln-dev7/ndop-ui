---
keywords: tabs, tab, tab list, tab panel, segmented, sections, switcher
---

Tabs split related content into sections shown one at a time, such as
the panes of a settings page. Only the selected tab is in the tab order;
the arrow keys move between tabs and show each one's panel, and Tab moves
on into the panel. `line` underlines the selected tab instead of raising
it, and `orientation="vertical"` stacks the tabs beside their panels.

## Do

- Keep tab labels short, and the content of each panel independent.
- Name the list with `aria-label` when nothing on the page names it.
- Use `activationMode="manual"` when showing a panel is slow, so moving
  through the tabs doesn't load each one.

## Don't

- Don't use tabs to step through a process in order; use a form with
  steps.
- Don't use them for site navigation between pages; use links, or
  Navigation Menu.
