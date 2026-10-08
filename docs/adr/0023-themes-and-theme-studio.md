# ADR-0023: Themes, the theme studio and the theme gallery

- Status: Accepted (approved by Valery on 2026-10-08)
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
