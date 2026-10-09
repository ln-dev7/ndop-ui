---
keywords: breadcrumbs, path, trail, hierarchy, navigation
---

A breadcrumb shows where the current page sits in the site's hierarchy,
with links back up. It's a `nav` landmark named "Breadcrumb" holding an
ordered list; the last item is the current page, marked
`aria-current="page"`, and separators are hidden from screen readers.

## Do

- Use `nav[ndBreadcrumb]` with `ol[ndBreadcrumbList]`, and `li` for items
  and separators.
- End with `ndBreadcrumbPage` for the current page, as text, not a link.
- Put a `chevron-right` or `/` in each separator; chevrons turn around in
  right-to-left layouts.

## Don't

- Don't use a breadcrumb as the site's main navigation.
- Don't show it on flat sites, where every page sits at the top level.
