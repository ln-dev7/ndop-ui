---
title: Introduction
description: What Ndop UI is, and how it differs from a component library you install as a package.
order: 1
---

Ndop UI is a set of accessible Angular components that you add to your app
as source files. You run `ndop add dialog`, and the dialog's code lands in
your project, ready to read, restyle or change. Nothing hides behind a
package boundary.

## How it works

Ndop has two layers:

- **Primitives** in `@ndop/primitives`: headless directives that implement
  the behavior, keyboard support and ARIA of each pattern. You install them
  as an npm package and update them like any dependency.
- **Styled items** from the registry: thin directives that wrap a primitive
  with Tailwind classes. These are the files `ndop add` copies into your
  project. They look like [shadcn/ui](https://ui.shadcn.com) and use the
  same design tokens.

The CLI records the version and a hash of every file it writes in
`ndop.lock.json`. That record is what lets a later version merge upstream
fixes into files you changed, instead of overwriting them.

## What it's built on

- Angular 21 or 22, standalone, signals-first and zoneless. Apps that still
  use zone.js work too.
- Tailwind CSS v4, configured in CSS.
- The Angular CDK for overlays, focus management and directionality.
- Server-side rendering and hydration, tested on every component.

## Next steps

- [Install Ndop](/docs/getting-started/installation) in an Angular app.
- Learn how [theming](/docs/getting-started/theming) and
  [dark mode](/docs/getting-started/dark-mode) work.
- See what the [CLI](/docs/getting-started/cli) can do.
