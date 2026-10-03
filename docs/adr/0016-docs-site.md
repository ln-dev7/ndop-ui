# ADR-0016: Docs site architecture and quality gates

- Status: Accepted (approved by Valery on 2026-10-03); deviates from
  RFC-0001 on preview isolation (see "Previews") and defers three RFC
  items (see "Deferred")
- Date: 2026-10-03
- Phase: 3
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Documentation site",
  "Machine-readable docs", Phase 3; ADR-0007, ADR-0008

## Context

Phase 3 is accepted when every Phase 1 component has a complete page
generated from metadata, and Lighthouse ≥ 95 and zero axe violations hold
on every route. The RFC fixes the stack (Analog, prerendering, Shiki at
build time), the page anatomy and the look. Checked on 2026-10-03:

- Analog 2.7.5's content plugin renders Markdown with Shiki at build time,
  and expects `shiki` ^1.29.2 (1.29.2 is the latest 1.x; 4.5.0 is current).
- `@lhci/cli` 0.15.1, last released 2025-06, bundles Lighthouse 12.6.1;
  `lighthouse` itself is at 13.5.0.
- Angular 22's `createComponent` accepts `directives` with `inputBinding`s.
- shadcn/ui renders component examples inline and only uses iframes for
  full-page blocks; it has no playground and offers "Open in v0" instead of
  StackBlitz. The playground and "Open in StackBlitz" are RFC-0001's own
  additions, kept (Valery, 2026-10-03).

## Decision

### Routes and content

- `/docs/<section>/<page>` from Markdown in `apps/docs/src/content`
  (Analog content, Shiki at build time with `shiki` 1.29.2, both themes
  rendered so dark mode needs no client highlighter).
- Get started in v1: Introduction, Installation (Angular CLI, Nx, Analog),
  Theming, Dark mode, CLI, `ndop.json`. Agents & MCP joins in Phase 4;
  migration guides, Primitives, Blocks and Themes in Phase 6.
- `/docs/components/<name>` pages are assembled from
  `r/metadata/<name>.json` and `r/<name>.json`, both built by `ndop build`
  before the docs build. The built registry is copied into the site, so
  ndop.dev serves `/r/` (ADR-0012).

### Previews

**Deviation:** RFC-0001 renders previews in an isolated frame. Decided
with Valery on 2026-10-03, after weighing iframes against inline
rendering for performance and SEO.

- **Inline by default.** Examples render in the page itself, server-side,
  so their markup is in the page's HTML for search engines and there is
  one Angular bootstrap per page. Each preview hydrates when it scrolls
  into view (`@defer (hydrate on viewport)`), which is the RFC's
  "lazy-hydrate previews on visibility". The docs use the same tokens and
  utilities as the components, so styles don't need an isolation boundary.
- **Per-preview dark and RTL toggles** put `.dark` and `dir` on the preview
  element. Overlays (dialog, popover, tooltip) would otherwise render
  outside it, at the end of `<body>`, so each preview provides its own CDK
  `OverlayContainer` inside the preview element; overlays then inherit the
  preview's theme and direction. Whether every primitive's overlay finds
  that container through the preview's injector is verified in step 3
  before relying on it.
- **The viewport switcher uses an iframe.** Examples use media queries
  (`sm:`), which only a real viewport triggers. Picking mobile or tablet
  swaps that preview for an `iframe` of `/preview/<example>` at that width,
  with the preview's theme and direction as query parameters. Preview
  routes are prerendered and marked `noindex`, with a canonical link to
  their component page.
- Dark and RTL toggles also exist site-wide (`.dark`, `dir` on `<html>`).

### Playground

Controls are generated from the main part's metadata: enum inputs become
segmented controls, booleans switches, strings text fields, numbers
sliders. Each item has a small playground host in the docs app that binds
those values to its main example's part; the host is compiled and tested
like the examples. The code snippet is generated from the same values, and
the state is serialized into the URL.

### Command palette

As ADR-0008: Ndop's own dialog over a build-time index.

### Machine-readable docs

`/llms.txt`, `/llms-full.txt` and a `.md` twin of every page are Analog
server routes, prerendered with the site, rendered from the same metadata
and Markdown. "Copy page for agent" copies the twin; "Open in Claude" opens
`https://claude.ai/new?q=` with a prompt that links the twin, since the
full page would exceed URL length limits.

### Page actions

"View source", "Report issue" and "Edit this page" link to
github.com/valerymelou/ndop. "Last updated" comes from git at build time;
version history from the registry snapshots.

### Quality gates

- **Lighthouse:** a `docs-lighthouse` executor in the workspace plugin
  runs `lighthouse` 13.5.0 directly (not `@lhci/cli`, whose bundled
  Lighthouse is a major behind) against the prerendered site served
  locally, with Playwright's Chromium, on every route with the default
  mobile profile. Any category under 95 fails it. It runs in its own CI
  job.
- **axe, hydration and links:** `docs-e2e` crawls every route like the
  harness does: server render, hydration without console errors, axe, and
  every internal link resolving.

### Deferred

These RFC items need things that don't exist yet; their UI stays out until
then, and this ADR is amended when each lands:

| Item                              | Waits for                           | Phase |
| --------------------------------- | ----------------------------------- | ----- |
| Open in StackBlitz                | `@ndop/*` published to npm          | 7     |
| Generated OG images               | The launch design pass              | 7     |
| Version switcher, changelog diffs | `ndop update` and released versions | 5     |

### Hosting

Decided with Valery on 2026-10-03: **Cloudflare Pages**, where ndop.dev is
registered. Checked against Cloudflare's docs that day:

- requests to static assets are free and unlimited on the free plan, and
  the site has no server functions, the only billed part;
- a `_headers` file (up to 100 rules) gives `/r/*@*.json` immutable
  caching and `/r/*` a CORS header;
- limits are far above the site's size: 20,000 files and 25 MiB per file.

The site is built in GitHub Actions and uploaded with
`wrangler pages deploy`, so the deployed files are the ones CI tested; an
API token with Pages edit access is stored as a GitHub secret. Whether
direct uploads from branches get preview URLs is checked when the deploy
job is written; if not, Pages' Git integration provides them. The deploy
job is added once ndop.dev is registered; Phase 3 acceptance doesn't depend
on it.

## Consequences

- Every component page and every machine-readable twin comes from the same
  metadata, so they can't disagree.
- Inline previews keep component pages to one bootstrap and their examples
  in the indexed HTML; the iframe, and its second bootstrap, only appears
  when a reader picks a narrower viewport.
- One playground host per item is the only per-component docs code.

## Amendment 1 (2026-10-03): a 640px content column

Status: Accepted; requested by Valery on 2026-10-03.

RFC-0001's design spec gives prose a 760px maximum. The docs cap the whole
middle column (title, description, prose and page links) at 640px instead,
centered between the navigation and the "On this page" rail, for shorter
lines. The navigation's 260px column is unchanged; its links' hover and
active backgrounds hug their text, its edge is a 1px line that fades out
toward both ends, and its list fades where it scrolls in and out of view.

## Amendment 2 (2026-10-03): shadcn's typography and plain code blocks

Status: Accepted; requested by Valery on 2026-10-03.

The docs match ui.shadcn.com's docs, measured on its pages that day,
instead of RFC-0001's design spec in two places:

- **Typography:** guides use 15px text with a 1.75 line height (not 16px
  and 1.65), a 30px title and 16px description, and headings scaled from
  the text (h2 1.25em, h3 1.125em) instead of a fluid `clamp()` scale. The
  navigation and the "On this page" rail use 12.8px links under 12px
  labels.
- **Code blocks:** as plain as ui.shadcn.com's: a copy button, line
  numbers on blocks of more than one line, and a 384px maximum height that
  scrolls without a visible scrollbar. Each block is configured where it
  is written, through its fence's meta string: `title="tsconfig.json"`
  adds a header with a file icon and the name; `pm` turns one npm command
  into npm, pnpm, yarn and bun tabs (WAI-ARIA tabs), whose copy button
  copies exactly the selected command, and whose choice applies to every
  block and is remembered. Guides show one command per block, so every
  copy is runnable. Line and word highlighting and diffs stay; there is
  no language label or collapsing. In step 3, examples sit in a card with
  the preview above and the code block attached below it. yarn is offered
  although the install test covers npm, pnpm and bun only.

On large screens the page no longer rubber-bands when pulled past its top
or bottom (`overscroll-behavior-y: none`); phones keep pull-to-refresh.
