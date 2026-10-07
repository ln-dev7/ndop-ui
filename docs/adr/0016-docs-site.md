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

Checked against Cloudflare's docs on 2026-10-04, for the deploy job:
`about/index.html` is served at `/about/`, but the docs don't say whether
`/about` is served directly or redirected, so the job checks that
`/docs/components/dialog` answers 200 without a redirect, and otherwise
prerenders `dialog.html` files (Nitro's `autoSubfolderIndex: false`).
Without a top-level `404.html`, Pages answers unknown paths with the home
page, so the site gets a real 404 page then. Pages sends
`Cache-Control: public, max-age=0, must-revalidate` by default; `_headers`
caches the hashed `/assets/*` files for a year.

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

## Amendment 3 (2026-10-03): site-wide preview theme, steps, collapsing and Badge

Status: Accepted; approved by Valery on 2026-10-03.

- **A preview's dark toggle switches the site's theme**, instead of
  putting `.dark` on the preview (see "Previews"). A preview can't be
  light inside a dark page: the `dark:` variant matches any `.dark`
  ancestor, so the page's own class wins. The toggle is the same switch as
  the header's, and the viewport frames follow it.
- **Numbered steps.** A component page's manual installation is a list of
  numbered steps, each with a title and its code, as on ui.shadcn.com.
  Guides write the same steps in Markdown with a `:::steps` block, in which
  each `###` heading starts a step; step titles stay out of the "On this
  page" rail.
- **Collapsing long files**, which amendment 2 left out: a titled block
  whose fence meta also has `collapse` starts collapsed when longer than
  12 lines, with an "Expand" button in its header and over its faded end.
  RFC-0001's code block spec lists "collapse for long files"; component
  pages use it for the files a manual install copies.
- **Badge comes forward from phase 6.** The docs use the registry's own
  components for their chrome, so the header's facts are `ndBadge` and its
  actions `ndButton`. Badge follows shadcn/ui new-york-v4 (ADR-0014) and
  is the first styled item without a primitive: it only styles its host,
  so it has no `spec.md`, and its metadata has no keyboard map or pattern.

## Amendment 4 (2026-10-03): no viewport switcher on component pages

Status: Accepted; approved by Valery on 2026-10-03.

**Deviation:** RFC-0001's hero preview has a viewport width switcher
(mobile, tablet, desktop). Component pages drop it, and with it the
`/preview/<example>` frame route (see "Previews"). Previews render inline
only, with the RTL and dark toggles.

Component examples are small, and readers can see a breakpoint by
resizing their window, as on ui.shadcn.com's component pages. The frame
cost a second Angular bootstrap whenever it was used and a prerendered,
`noindex` page per example for the quality gates to crawl. The Blocks
gallery, where layouts do depend on the viewport, brings device frames
back.

## Amendment 5 (2026-10-03): no per-preview toggles

Status: Accepted; requested by Valery on 2026-10-03.

**Deviation:** RFC-0001's hero preview has its own light/dark and RTL
toggles. Previews drop them, and with them their toolbar and their own
CDK `OverlayContainer` (see "Previews" and amendment 3). The site header's
theme and direction toggles apply to the whole page, previews and their
overlays included, as on ui.shadcn.com. A preview is now its example on a
dotted backdrop, with its code attached below.

## Amendment 6 (2026-10-04): machine-readable docs come from the data plugin

Status: Accepted; approved by Valery on 2026-10-04.

`/llms.txt`, `/llms-full.txt` and every page's `.md` twin
(`/docs/components/dialog.md`, `/docs/getting-started/installation.md`)
are generated by `build/component-docs.ts`, from the same data as the
pages. The dev server serves them through middleware, and the build emits
them as static files next to the prerendered HTML, with `text/markdown`
and `text/plain` content types set in `_headers`.

They are not Analog server routes (see "Machine-readable docs"): Analog's
dev server serves those only under `/api`, and Nitro bundles them without
the docs' Vite plugin, so they would need a second code path from the
registry to Markdown. The URLs, the content, "Copy page for agent" and
"Open in Claude" are unchanged.

## Amendment 7 (2026-10-04): a page menu on the CDK menu

Status: Accepted; approved by Valery on 2026-10-04.

A page's actions are one split button beside its title, as on
ui.shadcn.com: "Copy page" copies its Markdown twin, and a menu next to it
holds "View as Markdown", "Open in Claude", "Open in ChatGPT" and, on
component pages, "Copy install command", "View source" and "Report issue".

The registry has no Dropdown Menu until phase 6 (ADR-0004 plans it on
`@angular/aria/menu`), so this menu is the docs' own, on the CDK's
`@angular/cdk/menu`, which implements the WAI-ARIA menu button pattern,
with shadcn's dropdown classes. It lives in `apps/docs` only and is
replaced by the registry's Dropdown Menu when that exists.

## Amendment 8 (2026-10-07): CPU throttling calibrated to the runner

Status: Accepted; approved by Valery on 2026-10-07.

The Lighthouse gate fails or passes depending on which machine GitHub
assigns. Lighthouse slows the CPU by "a constant 4x CPU multiplier"
(Lighthouse's `docs/throttling.md`), so the same page scores lower on a
slower host. Phase 4's first CI run sent the same bytes as Phase 3's
passing run, but on a runner whose `benchmarkIndex` was 27% lower:

| Run                         | Median benchmark | Theming page TBT | Dialog page TBT | Lowest performance |
| --------------------------- | ---------------- | ---------------- | --------------- | ------------------ |
| Phase 3 (37257777361), pass | 3,200            | 107 ms           | 216 ms          | 95                 |
| Phase 4 (37463011601), fail | 2,348            | 266 ms           | 337 ms          | 90                 |

Every route dropped by about the same amount, including guides Phase 4
didn't change. Lighthouse's documentation recommends choosing
`cpuSlowdownMultiplier` from the host's `benchmarkIndex` for exactly this.

- **Calibration:** before scoring, the `docs-lighthouse` executor runs a
  performance-only Lighthouse pass on `/` three times and takes the
  median `benchmarkIndex`. Every route is then measured with
  `cpuSlowdownMultiplier` = 4 × benchmark ÷ 3,200, rounded to one decimal
  and kept between 1 and 8. On a runner like Phase 4's that's 2.9×; on
  the development machine (about 3,860) it's 4.8×, stricter than before.
- **Reference:** 3,200 is the median benchmark of the CI run that accepted
  Phase 3, where 4× was used. So every run emulates the device that run
  emulated; what Phase 3 accepted stays the bar. Lighthouse's own
  device-class table predates Lighthouse 10's change to the benchmark
  scale, so it isn't used.
- **Unchanged:** the median of three runs per route, the mobile profile,
  simulated network throttling, and the bar: any category under 95 fails.
  Only the CPU multiplier moves.
- **Reported:** the log and each report record the benchmark and the
  multiplier used, so a score can be compared across runs.
- **When Lighthouse or Chrome changes its benchmark** (as Lighthouse 6.3
  and 10 did), the reference is re-measured from a CI run with 4× and this
  amendment is updated.

Consequences: a slow runner no longer fails the gate, and a real
regression still does, since it costs more CPU on any machine. A runner
far slower than any seen so far is measured with less slowdown, down to
none; the 1× floor keeps a very slow machine from being measured faster
than it is.

## Amendment 9 (2026-10-07): previews hydrate on hover or interaction

Status: Accepted; approved by Valery on 2026-10-07.

**Deviation:** RFC-0001 mitigates live previews' cost by "lazy-hydrate
previews on visibility", and "Previews" above hydrates each one when it
scrolls into view. On the component pages, the main preview is in view at
load, so it hydrated just after startup, in its own long task. On the CI
runners that task was 114 ms for Popover and 120 ms for Dialog, whose
examples set up the CDK overlay, against 65 ms for Label, and it left
those two pages at 93–94 with the calibrated slowdown (amendment 8).

- Previews now hydrate on hover or interaction (`@defer (on immediate;
hydrate on hover; hydrate on interaction)`): the first pointer over a
  preview, focus into it, a click or a key press. Angular replays a click
  or key press that hydrates one, so the popover still opens on the first
  click; hover covers examples like Tooltip that respond to it.
- Server rendering is unchanged, so previews look the same at once; only
  their behavior attaches later.
- This is lazier than the RFC's visibility, for the same reason the RFC
  gives: keeping previews' cost off the page's load.

Consequences: the post-startup task is gone on every component page, so
Popover's blocking time on a slow runner drops by about 64 ms, below
Label's, which scores 96. A preview responds a moment later the first
time it's used, while its code is fetched.
