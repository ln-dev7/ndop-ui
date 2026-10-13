---
title: Roadmap
description: What Ndop plans after 1.0, what waits on a condition, and what it leaves out on purpose.
order: 11
---

This roadmap lists what Ndop has decided to build after 1.0, what waits on
a condition outside its control, and what it leaves out on purpose. Each
item links the decision behind it. There are no dates: an item lands when
it's ready, or when its condition is met.

To suggest something, [open an issue](https://github.com/ndop-ui/ui/issues).

## After 1.0

- **A hosted MCP server at `ndop.dev/mcp`.** The site is static files and
  one small function; a remote MCP server needs a deployment of its own
  and limits against abuse. Until then, `npx -y @ndop/mcp` runs the same
  server locally for every agent.
  [ADR-0028](https://github.com/ndop-ui/ui/blob/master/docs/adr/0028-release-and-deploy.md),
  [ADR-0009](https://github.com/ndop-ui/ui/blob/master/docs/adr/0009-mcp-server.md)
- **A version switcher on the docs site,** once Ndop has a second major
  version. With one version, and the same components on Angular 21 and 22,
  it would list a single entry; each component's changelog already shows
  every version.
  [ADR-0028](https://github.com/ndop-ui/ui/blob/master/docs/adr/0028-release-and-deploy.md),
  [ADR-0016](https://github.com/ndop-ui/ui/blob/master/docs/adr/0016-docs-site.md)
- **A Figma plugin.** The theme studio exports tokens as JSON in the W3C
  Design Tokens format, so a plugin can bring a theme into Figma.
  [RFC-0001](https://github.com/ndop-ui/ui/blob/master/rfcs/0001-ndop-ui.md),
  [ADR-0023](https://github.com/ndop-ui/ui/blob/master/docs/adr/0023-themes-and-theme-studio.md)
- **Full-text search with Algolia DocSearch,** applied for once ndop.dev
  is live. Until then, the search palette covers titles, headings,
  components, props and keyboard shortcuts, but not the text of guides.
  [ADR-0008](https://github.com/ndop-ui/ui/blob/master/docs/adr/0008-docs-search.md),
  [ADR-0028](https://github.com/ndop-ui/ui/blob/master/docs/adr/0028-release-and-deploy.md)
- **`ndop init` for Nx and Analog workspaces.** `init` reads
  `angular.json`, so it sets up Angular CLI workspaces only. Nx and Analog
  apps follow a few manual steps in
  [Installation](https://ndop.dev/docs/getting-started/installation),
  after which `ndop add` and `ndop update` work as usual.
  [ADR-0011](https://github.com/ndop-ui/ui/blob/master/docs/adr/0011-cli-architecture.md)
- **More pattern guides:** forms with Signal Forms, data fetching with
  `resource()`, responsive layouts, and i18n and RTL, next to "Build your
  own registry".
  [RFC-0001](https://github.com/ndop-ui/ui/blob/master/rfcs/0001-ndop-ui.md),
  [ADR-0016](https://github.com/ndop-ui/ui/blob/master/docs/adr/0016-docs-site.md)

## When a condition is met

- **Primitives on `@angular/aria`.** They build on the Angular CDK today.
  Once `@angular/aria`'s API stays the same across two consecutive Angular
  majors, they can move onto it. Your code wouldn't change, since you
  import only `@ndop/primitives`.
  [ADR-0004](https://github.com/ndop-ui/ui/blob/master/docs/adr/0004-primitives-on-aria-and-cdk.md)
- **A `--diff3` conflict style for `ndop update`,** whose markers add a
  `||||||| base` section with the version both sides started from.
  [ADR-0003](https://github.com/ndop-ui/ui/blob/master/docs/adr/0003-three-way-merge-strategy.md),
  [ADR-0020](https://github.com/ndop-ui/ui/blob/master/docs/adr/0020-diff-and-update.md)
- **Other icon libraries in `ndop.json`.** `iconLibrary` accepts `lucide`
  until a second icon resolver exists. Your `icons.ts` is your own file
  meanwhile, so it can map Ndop's icon names to any set.
  [ADR-0013](https://github.com/ndop-ui/ui/blob/master/docs/adr/0013-icons-adapter.md)

## Not planned

These are outside version 1 by design:

- NgModule apps, and Angular versions older than the current major and the
  one before it.
- Styling without Tailwind, such as CSS-in-JS. The tokens are CSS
  variables, so other styling can come later.
- A visual drag-and-drop builder. Blocks and the theme studio cover that
  need.
- A paid tier. Everything is MIT licensed.

[RFC-0001](https://github.com/ndop-ui/ui/blob/master/rfcs/0001-ndop-ui.md),
"Non-goals".
