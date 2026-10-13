# ADR-0023: Themes, the theme studio and the theme gallery

- Status: Accepted (approved by Valery on 2026-10-08), with amendment 1
- Date: 2026-10-08
- Phase: 6
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Token system", "Themes as
  registry items", "DX features" (theme studio), Phase 6; ADR-0006,
  ADR-0012, ADR-0016

## Context

Phase 6 ships a theme studio that exports CSS, a theme URL and JSON, and a
community theme gallery.

- A theme is a `registry:theme` item (`registry/themes/<name>/theme.css`,
  which `ndop build` turns into `cssVars`). Only `default` exists.
- `ndop init --theme <name>` accepts a name from Ndop's registry only. It
  can't take a URL or a namespaced theme, and there is no way to change the
  theme after `init`.
- The RFC: "`ndop add theme:<name>` or `ndop init --theme <url>` installs
  one; the theme studio on the docs site produces the same format."
- Tokens are shadcn's names (ADR-0006), so shadcn and tweakcn themes paste
  in. tweakcn publishes them as `registry:style` items with `cssVars`.
- The site is static files on Cloudflare Pages (ADR-0016).

## Decision

### Installing themes

- `ndop init --theme` and `ndop add` accept a theme as a name, a
  namespaced name (`@acme/ocean`) or a URL to a theme item's JSON. The
  RFC's spelling, `ndop add theme:<name>`, is accepted too; `theme:` only
  asserts the item's type.
- `add` of a theme in an initialized project replaces the theme's
  variables in the Tailwind CSS file, in the block `ndop init` wrote. The
  lockfile records it like any item, so `ndop update` merges local token
  edits.
- `registry:style` items with `cssVars` (tweakcn's and shadcn's format)
  install the same way, so existing shadcn themes work unchanged.

### Theme studio, `/themes/studio`

- Edits every semantic token for light and dark, in OKLCH (lightness,
  chroma and hue sliders, plus a hex field), with WCAG 2 contrast ratios
  shown for each foreground and background pair and a warning under 4.5:1
  (3:1 for borders and rings).
- Edits radius, fonts (from a short list served by Google Fonts and loaded
  only in the studio) and density.
- Starts from any gallery theme.
- Applies the theme live to the whole site and to a sample dashboard on
  the page, the `dashboard-01` block.
- Its state is in the URL, so a link reproduces the theme. The studio
  hydrates on load; the rest of the page stays static.

### Exports

- **CSS:** the `:root`, `.dark` and `@theme` blocks to paste into the
  Tailwind CSS file.
- **JSON:** the tokens in the W3C Design Tokens (DTCG) format, for design
  tools and a later Figma plugin.
- **Theme URL:** `https://ndop.dev/r/themes/custom.json?t=<encoded>`, a
  real registry item URL, so `ndop init --theme <url>`, `ndop add <url>`
  and the shadcn CLI all install it. A Cloudflare Pages Function decodes
  `t` into the theme item; it has no storage and nothing else, and the
  response is cached by URL. **Deviation:** the site is otherwise static
  (ADR-0016). The local `serve-site` executor serves the same function, so
  e2e tests cover it.
- **Copy CLI command** for the URL.

### Theme gallery, `/themes`

- Every theme in `registry/themes/` is in the gallery, each previewed on a
  sample card set in light and dark, with "Open in studio" and its install
  command.
- Community themes arrive as pull requests: a `theme.css` and a
  `registry.json` entry with `author`. The `theme` generator writes both.
- `ndop build` fails a theme whose foreground and background pairs are
  under 4.5:1 in light or dark, so every gallery theme is accessible.
- The first release seeds the gallery with a few themes of Ndop's own
  (neutral, plus four colored ones), each credited if it adapts a palette.

## Consequences

- Themes from shadcn, tweakcn and Ndop's studio all install through one
  path.
- The site runs one small serverless function. If it goes down, studio
  links still work, but their install URL doesn't.
- The contrast rule can reject a theme the author likes. That's
  deliberate, since the docs promise zero accessibility violations.

## Amendment 1 (2026-10-12): theme sheets in the visual tests

Status: Accepted by Valery on 2026-10-12 (ADR-0029).

Examples and blocks are screenshotted in the default theme only, so a
change that breaks another theme went unseen. Each `registry:theme` now
has a theme sheet in the harness, and the visual test checks it.

- **Route:** `/themes/<name>` in `apps/harness`, linked from the harness
  home page, so prerendering and the e2e quality crawl (axe, hydration,
  one `main`) cover every sheet.
- **Content:** the registry's styled items as an app uses them: token
  swatches, every Button variant and size, every Badge variant, a Card
  with a labelled form (Input, Select, Textarea, RadioGroup, Checkbox,
  Switch), default and destructive Alerts, Tabs, Progress, Skeletons, a
  sidebar-style menu on the `sidebar-*` tokens, a bar chart in
  `--chart-1` to `--chart-5` (Chart's container, grid and legend) and a
  Table. The header names the theme's sans and mono fonts and radius.
- **Values:** the harness bundles `registry/themes/*/theme.css` as text
  and reads its `@theme`, `:root` and `.dark` blocks, so the sheets need
  no registry build. The values go in a stylesheet scoped to the page's
  `main`, written into the document head on the server and in the
  browser: light by default, dark under a `.dark` ancestor or system
  mode with a dark preference, the same conditions as `dark:`. A sheet
  takes a theme exactly as an installed theme would, and follows the
  page's color scheme.
- **Fonts:** a theme's `font-sans` and `font-mono` must be loaded by the
  harness's stylesheet, directly or through the theme it imports. A unit
  test fails for a theme whose font isn't, naming the `@fontsource`
  import to add (from `@ndop/schema`'s `THEME_FONTS`); the sheet shows the
  same message instead of the components and logs it, which fails the
  quality test.
- **Visual test:** the theme list comes from `registry.json`'s
  `registry:theme` items, the default theme included. Each sheet is
  opened like an example (frozen clock, from the home page, pointer
  moved away) and screenshotted full page in light and dark, with no RTL:
  two baselines per theme, `<name>-light.png` and `<name>-dark.png`. The
  tests are named `theme-sheet <name> in <mode>`, so
  `--grep="theme-sheet"` updates only them.
- **Visual executor:** it waited for a TCP connection to the browser
  server, which Docker's port proxy accepts before the server in the
  container listens; it now waits for an HTTP answer.
