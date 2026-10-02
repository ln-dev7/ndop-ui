# ADR-0006: Token naming compatible with shadcn

- Status: Accepted (approved by Valery on 2026-10-02), with Amendment 1
- Date: 2026-10-02
- Phase: 1
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Token system"

## Context

RFC-0001 keeps token names compatible with shadcn's so existing shadcn
themes paste in unchanged, uses OKLCH, a `.dark` class plus
`prefers-color-scheme`, motion tokens, and density switchable per subtree
with `data-density`.

Checked on 2026-10-02:

- shadcn's current Tailwind v4 color item
  (`https://ui.shadcn.com/r/colors/neutral.json`, field `cssVarsV4`)
  defines these variables, in OKLCH: `background`, `foreground`, `card`,
  `card-foreground`, `popover`, `popover-foreground`, `primary`,
  `primary-foreground`, `secondary`, `secondary-foreground`, `muted`,
  `muted-foreground`, `accent`, `accent-foreground`, `destructive`,
  `border`, `input`, `ring`, `chart-1` to `chart-5`, `radius` (light only),
  `sidebar`, `sidebar-foreground`, `sidebar-primary`,
  `sidebar-primary-foreground`, `sidebar-accent`,
  `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.
- **shadcn no longer defines `--destructive-foreground`**, which the RFC's
  Button example uses.
- With the installed Tailwind 4.3.3, a real compile confirmed:
  - `@theme inline { --color-primary: var(--primary); }` makes `bg-primary`
    read the variable, and opacity modifiers (`bg-primary/50`) work through
    `color-mix`.
  - A block `@custom-variant dark { … }` can match both `.dark` and
    `@media (prefers-color-scheme: dark)` scoped to an attribute.
  - Spacing utilities compile to `calc(var(--spacing) * N)`, so overriding
    `--spacing` on a subtree rescales them.
  - Logical utilities such as `ms-2` are available.

## Decision

### Names

- Ndop's semantic tokens are **exactly shadcn's list above**, same names and
  meanings, so a shadcn theme's `:root` and `.dark` blocks paste in
  unchanged.
- Ndop adds, as a superset:
  - `--destructive-foreground`, defined in Ndop's base CSS with a default.
    A pasted shadcn theme that lacks it still renders correctly.
  - Motion: `--duration-fast`, `--duration-normal`, `--duration-slow`,
    `--ease-out`, `--ease-in-out`, all set to `0s` (durations) under
    `prefers-reduced-motion: reduce`.
  - Component tokens only when a component needs one, named
    `--<component>-<property>` and documented in its metadata.
- The default theme uses shadcn's neutral values (MIT licensed), credited in
  the CSS file.

### Where the CSS lives

The split follows the RFC's architecture, behavior through npm and
customizable values owned by the user:

- **Mechanics** ship in `@ndop/core` as `@ndop/core/styles.css`, imported
  after `tailwindcss`: the `@theme inline` mapping, the dark variant, motion
  defaults and the reduced-motion override, density, and the
  `--destructive-foreground` default. Fixes reach users through
  `npm update`.
- **Values** are a theme: `:root` and `.dark` token blocks.
  `registry/themes/default/theme.css` holds the default theme in Phase 1.
  Phase 2 wraps it as a `registry:theme` item that `ndop init` copies into
  the user's stylesheet.

### Tailwind mapping

`@ndop/core/styles.css` contains:

- An `@theme inline` block mapping every color token to
  `--color-<name>: var(--<name>)`, and a radius scale derived from
  `--radius`. The scale is Ndop's own and is documented as such, not
  presented as shadcn's.
- **Dark mode** is a block `@custom-variant dark` matching `.dark` and, under
  `@media (prefers-color-scheme: dark)`, `[data-ndop-theme="system"]`. Dark
  token values are emitted for the same two selectors.
  `provideNdop({ theme })` sets `class="dark"` for `'dark'`, nothing for
  `'light'`, and `data-ndop-theme="system"` for `'system'`. System mode is
  resolved by CSS alone, so server-rendered pages show the right theme
  before hydration, with no flash.
- **Density** is `[data-density="compact" | "comfortable"]` overriding
  `--spacing` (default `0.25rem`), so every spacing utility rescales on that
  subtree. The exact values are tuned in Phase 1.

## Consequences

- shadcn themes, and the shadcn theme generators people already use, work
  with Ndop without translation.
- If shadcn renames or removes a token, the default theme keeps working; the
  ADR records the change when Ndop follows.
- The RFC's Button example keeps `text-destructive-foreground`, backed by
  the added token.

## Amendment 1 (2026-10-02): base layer and fonts

Status: Accepted by Valery on 2026-10-02.

**Base layer (Phase 1).** `@ndop/core/styles.css` also carries the base
defaults from shadcn's style (registry item `new-york-v4/index`): every
element's border and outline take `border-border` and `outline-ring/50`, and
`body` takes `bg-background text-foreground`. Tailwind v4 draws borders in
`currentColor`, so without this, borders rendered near-black. The token e2e
suite checks it.

**Fonts: Geist, as shadcn (Phase 2).**

- Themes set `--font-sans` and `--font-mono`, which Tailwind v4 reads for
  `font-sans` and `font-mono`. The default theme uses Geist and Geist Mono,
  each followed by the system font stack as a fallback.
- Fonts are self-hosted from npm: `@fontsource-variable/geist` and
  `@fontsource-variable/geist-mono` (5.3.0 on 2026-10-02, SIL Open Font
  License 1.1). They are the default theme item's dependencies; `ndop init`
  adds their imports to the app stylesheet.
- An app that brings its own font overrides the tokens only. The theme
  studio (Phase 6) edits the same tokens.
- Implemented with the default theme registry item in Phase 2, versions
  re-checked then.
