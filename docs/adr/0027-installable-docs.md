# ADR-0027: Installable docs (favicons and PWA)

- Status: Accepted (approved by Valery on 2026-10-12), with amendment 1
- Date: 2026-10-12
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Documentation site";
  ADR-0016, ADR-0026

## Context

The docs site has a placeholder favicon. Valery wants proper favicons and
the site offered for installation on phones. The site is static,
prerendered and served by Cloudflare Pages (ADR-0016).

## Decision

### Icons

From the logo (ADR-0026):

- `favicon.svg` (the indigo tile) and `favicon.ico` (16, 32, 48 px) for
  browsers without SVG favicons.
- `apple-touch-icon.png`, 180 px.
- Manifest icons: 192 and 512 px, plus a 512 px **maskable** icon with
  the mark inside the safe zone on indigo.
- Generated from the SVG masters by a build step, so they never drift
  from the logo.

### Web app manifest

`/manifest.webmanifest`: name "Ndop UI", short name "Ndop", `start_url`
`/`, `display: standalone`, indigo `theme_color` with a dark variant via
`<meta name="theme-color" media="(prefers-color-scheme: dark)">`, neutral
`background_color`, the icons above.

### Service worker: installable and offline

A small hand-written service worker, with no outside dependency:

- **Precache** the app shell, the offline page and the fonts at install
  (well under 1 MB).
- **Assets** (hashed JS and CSS): cache first.
- **Pages:** network first, falling back to the cached copy, then to
  `/offline`, so pages already visited read offline.
- **Never cached:** `/r/` (registry JSON the CLI fetches must be fresh),
  the theme URL function, and cross-origin requests.
- A new deploy activates on the next navigation; old caches are deleted.

### Offering installation

- Chrome and Android: an "Install app" item in the header's menu, shown
  when the browser fires `beforeinstallprompt`, which it calls.
- iOS Safari has no prompt: a one-time, dismissible hint ("Share, then
  Add to Home Screen") on the second visit, remembered in `localStorage`.
- Never a modal or a banner over content.

### Tests

The docs e2e checks the manifest and icons, that the service worker
registers and serves a visited page offline (Chromium), and that `/r/`
bypasses it. Lighthouse's PWA-related audits run in the docs check.

## Consequences

- Readers can install the docs and read visited pages offline.
- A service worker can serve stale pages if mishandled; network-first
  pages and versioned caches keep a deploy visible on the next load.

## Amendment 1 (2026-10-14): no install offer of the site's own

Status: Accepted by Valery on 2026-10-14.

The site no longer offers installation itself. Valery removed the
header's "Install app" first, then the same item and the iOS hint from the
navigation sheet: the docs shouldn't ask readers to install them.

- The "Offering installation" section is withdrawn: no `Install app`
  control, no iOS hint, and `index.html` no longer keeps the
  `beforeinstallprompt` event, so Chrome and Android show their own
  install offer as they see fit.
- Everything else stands: the icons, the manifest and the service worker,
  so the docs stay installable from the browser's menu and readable
  offline.
