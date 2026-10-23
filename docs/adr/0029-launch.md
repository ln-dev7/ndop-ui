# ADR-0029: Launch checklist and success metrics

- Status: Accepted (approved by Valery on 2026-10-12)
- Date: 2026-10-12
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Success metrics",
  "Documentation site", Phase 7; ADR-0016, ADR-0021, ADR-0023, ADR-0026,
  ADR-0027, ADR-0028

## Context

Phase 7 is accepted "when every success metric with a CI measurement is
met and the launch checklist is complete". The RFC names no checklist.
One metric can't be met as written: Lighthouse ≥ 95 on every page, while
ADR-0016 amendment 14 made Performance warn only and some reference pages
score 66–91. Phase 6 also left three items for early Phase 7.

## Decision

### Success metrics: Docs performance (amends RFC-0001)

**Deviation:** "Lighthouse ≥ 95 on every page" becomes: Accessibility,
Best Practices and SEO ≥ 95 on every page (SEO skipped where a page asks
not to be indexed); Performance ≥ 95 on the landing page and every
component, block and guide page, warn-only on the primitives reference
and changelog pages. LCP < 1.5 s on the same pages as Performance. The
docs Lighthouse check enforces exactly this.

### Early items (from Phase 6)

1. **CI speed-up** (amends ADR-0021): the visual check moves to its own
   job instead of following Chromium's e2e, and each browser's e2e runs in
   two shards. Target: a full run in about 27 minutes (42 today).
   Lighthouse keeps checking every page.
2. **Theme sheets** (amends ADR-0023): a harness route `/themes/<name>`
   renders a representative set of components with each `registry:theme`;
   the visual test screenshots each in light and dark, two images per
   theme, listed from `registry.json`. Example baselines stay in the
   default theme.
3. **Chart labels on phones:** axis and value labels move out of the
   scaled SVG into positioned HTML in the Chart item, so they keep their
   size at every width; a Chart minor version with a changelog entry.

### Content

- **Migration guides** (RFC "Get started"): "Migrating from Angular
  Material" (component and API mapping, theming, the CDK they share) and
  "Migrating from spartan/shadcn" (`ndop init` into an existing app, the
  registry and class parity, `ndop add` over copied files). Each mapping
  table is checked against the installed versions they name.
- **Launch write-up**, "Updating code you own: three-way merges in a
  component registry": on the docs site under `/blog/`, with the update
  fixture suite's numbers.
- **Public roadmap**: `ROADMAP.md` and a docs page: hosted MCP, the version
  switcher, a Figma plugin from the JSON tokens, and the deferred items.
- **CONTRIBUTING** gains the per-component definition of done and how to
  add a theme or a block with the generators.

### Launch checklist

Complete when all are true:

1. Every CI-measured success metric is met (as amended above).
2. 1.0.0 packages are published with provenance, and the registry is at
   1.0.0 (ADR-0028).
3. `ndop.dev` is deployed by the Deploy workflow, with PR previews, the
   theme URL Function and the service worker working (ADR-0027).
4. The landing page, OG images, favicons and PWA are live (ADR-0026,
   ADR-0027).
5. Both migration guides, the write-up, the roadmap and CONTRIBUTING are
   published.
6. The public registry template repo exists and builds (ADR-0025).
7. The agent eval has been run on the release (Valery's run, ADR-0019)
   and its accuracy is recorded.

## Consequences

- Phase 7 has a concrete, checkable finish line.
- Heavy reference pages are measured but don't block launch; the pages
  most readers land on are held to 95.

## Result (2026-10-23): Phase 7 accepted

Status: Accepted by Valery on 2026-10-23.

1. **Success metrics:** CI on `bda5214` was green: Lighthouse on every
   page as amended above, axe and keyboard tests in three browsers, size
   budgets, the update fixtures at 36/39 (92.3%), and new app to built app
   in 21–44 s across the install cases, against a 120 s budget. Agent
   accuracy is item 7.
2. **Packages:** the nine `@ndop/*` packages are at 1.1.0 on npm with SLSA
   provenance (1.0.0 on 2026-10-14); all 210 registry items are 1.x.
3. **ndop.dev:** deployed by the Deploy workflow, whose smoke check covers
   the theme URL Function, the service worker, `404.html` and `/r/`; PR
   previews post their URL; `ndop.pages.dev` is `noindex`.
4. **Landing, OG images, favicons, PWA:** live (manifest, icons, `/offline`,
   per-page OG images).
5. **Content:** both migration guides, the write-up at
   `/blog/updating-code-you-own`, the roadmap (`ROADMAP.md` and
   `/docs/getting-started/roadmap`) and CONTRIBUTING (definition of done,
   theme and block generators) are published.
6. **Template repo:** `ndop-ui/registry-template` is a template repository
   and its Deploy registry workflow passed.
7. **Agent eval on 1.1.0:** 92/92 after ADR-0019 amendment 4 (89/92,
   96.7%, counting the three prompts that passed only on their second
   attempt as failures).

Also shipped in Phase 7: Algolia DocSearch in the ⌘K palette (ADR-0008),
SEO (ADR-0016 amendment 15) and the blog (amendment 16).
