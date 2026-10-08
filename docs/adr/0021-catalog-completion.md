# ADR-0021: Completing the v1 catalog

- Status: Accepted (approved by Valery on 2026-10-08). Deviates from the
  definition of done for items without behavior
- Date: 2026-10-08
- Phase: 6
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Component catalog and
  definition of done", "Quality engineering and CI", Phase 6; ADR-0004,
  ADR-0005, ADR-0007, ADR-0014, ADR-0015

## Context

Phase 6 ships the rest of the v1 catalog: 42 components on top of the eight
that exist (Button, Badge, Input, Label, Separator, Dialog, Popover,
Tooltip). Every one must meet the RFC's definition of done.

What exists today:

- Generators: `primitive` only. The RFC's Nx-first rule asks for
  `styled-item`, `example`, `block` and `theme` generators too.
- Tests: unit, axe, keyboard, SSR and zoneless, in `registry/ui/*/*.spec.ts`
  and `apps/harness-e2e`. **There is no visual regression test and no
  bundle-size check**, though both are in the definition of done and in the
  RFC's quality table. Phase 1 was accepted without them.
- `@angular/aria` was never installed; ADR-0004 left it to this phase,
  and amendment 3 there keeps it out.
- Badge is a styled item without a primitive or `spec.md` (ADR-0016,
  amendment 3). The definition of done asks every component for both.

## Decision

### Components without a primitive

Items with no behavior beyond native HTML get a styled item, examples and
docs, but no primitive and no `spec.md`. Their accessibility notes (landmark
labels, `aria-current`, `role="status"`) live in `docs.md` and in the
item's TSDoc, and their axe, SSR, zoneless and visual tests still run.
**Deviation** from the definition of done, which asks every component for a
primitive and a `spec.md`.

They are: Card, Badge, Table, Skeleton, Spinner, Empty State, Aspect Ratio,
Alert, Breadcrumb, Pagination, Scroll Area (native overflow with the
standard `scrollbar-*` properties) and Textarea. Textarea's state wiring
(`aria-invalid`, `data-*` from forms) reuses the Input primitive's
directive, as `textarea[ndInput]`.

Some items compose existing primitives and add none of their own: Sheet
(Dialog), Date Picker (Popover, Calendar and Input), Data Table (Table
and the `data-table` lib) and Chart. Their pages link the `spec.md` of what they
compose.

### What backs each primitive

ADR-0004, amendment 3, records the foundation of each new primitive: the
CDK (menu, listbox, accordion, key managers, overlay) and Ndop-owned code,
with no `@angular/aria`. Overlays reuse the Phase 1 overlay internals.

### No third-party runtime dependencies

Ndop installs nothing but Angular's packages, `@ndop/*`, and what it
already uses: `clsx`, `tailwind-merge` and `tw-animate-css` through
`@ndop/core`, the default icons (`@lucide/angular`, swappable) and the
default theme's fonts. Many Angular shadcn alternatives depend on outside
libraries, and Ndop deliberately doesn't (Valery, 2026-10-08). So
Phase 6's harder items are Ndop's own, copy-in code:

| Item       | How                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart      | SVG charts the user owns: area, bar, line, pie/donut and radial, from a `chart` lib item with linear, band and time scales, nice ticks and path builders. They render on the server like any template, take colors from the chart tokens, and are accessible: a figure caption, keyboard-reachable tooltips and a data table fallback. |
| Data Table | A `data-table` lib item: table state on signals (sorting, filtering, pagination, row selection, column visibility) over a native `<table>` with the Table styles. `@angular/cdk/scrolling` virtualizes long tables when needed.                                                                                                        |
| Calendar   | Date math on `Date` and `Intl` only. Locale, first day of week and RTL come from `Intl` and `Directionality`.                                                                                                                                                                                                                          |
| Toast      | Sonner-style stacking on a CDK global overlay, with announcements through a live region.                                                                                                                                                                                                                                               |

Command's filtering, Drawer's drag, Input OTP and Resizable are Ndop's
own code too. A new runtime dependency needs its own amendment.

### Generators

Before the first new component, `tools/workspace-plugin` gains:

- `styled-item <name> [--primitive]`: `registry/ui/<name>/<name>.ts`, its
  spec, `docs.md`, the `registry.json` entry at 0.1.0 and a changelog with
  its first section.
- `example <item> <case>`: `registry/examples/<item>-<case>.ts`, the
  `registry.json` entry, and the item's `ndop.examples` list.
- `block` and `theme` (ADR-0022, ADR-0023).

Each runs `--dry-run` cleanly and is unit-tested like `primitive`.

### Visual regression

- Playwright `toHaveScreenshot` on every example route in the harness, in
  light, dark and RTL, Chromium only, animations off, no pixel tolerance.
- Screenshots depend on fonts and rendering, so both CI and baseline updates
  run in the Playwright image `mcr.microsoft.com/playwright:v1.63.0-noble`.
  A `harness-e2e:visual` target runs it through Docker locally;
  `--update` rewrites the baselines, which are committed.
- It runs in CI's `main` job, on Node 24 only.
- The eight existing items get baselines in the first step.

### Bundle-size budgets

- A `size` executor in `tools/workspace-plugin` measures, for each item,
  the gzip bytes its styled item and primitive add to a production build of
  a minimal zoneless app, against the same app without it. Angular itself
  is in both builds, so it isn't counted; CDK code the item pulls in is.
- Each item is built separately, in parallel, and Nx caches the result per
  item, so only changed items rebuild.
- Budgets live in `tools/size/budgets.json`: Button 2 kB and Dialog 8 kB
  from the RFC; 4 kB for other items unless an amendment sets another.
  The chart and data table libs get their own budgets when they land.
- It runs in CI's `main` job.

### Docs grouping

The component nav groups items as the RFC's catalog table does (Inputs,
Overlays, Navigation, Data display, Feedback, Layout). Each item's group is
its first `categories` entry, which the build validates.

### Order of work

In batches, each green in CI before the next: native and presentational
items; form controls; overlays; composite widgets (tabs, menus, listbox);
data and dates. The plan lists the batches.

## Consequences

- Twelve items ship with no primitive and no keyboard map. Their pages say
  so, and the metadata rule that requires a keyboard map skips them, as it
  does for Badge.
- Charts and the data table are the largest code Ndop owns. In exchange,
  users install no outside package, and charts render on the server.
- CI gains a Docker-based visual job and per-item size builds. Visual
  baselines change whenever a style changes, which is the point; updating
  them is one command.
