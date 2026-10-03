# ADR-0014: Styled items and examples

- Status: Accepted (approved by Valery on 2026-10-02)
- Date: 2026-10-02
- Phase: 2
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Styled layer, variants and
  theming"; ADR-0005; ADR-0006

## Context

Phase 2 ships a styled item and at least two examples for each Phase 1
primitive. Valery wants them to look like shadcn's defaults. shadcn's
registry serves each component's source with its exact classes at
`https://ui.shadcn.com/r/styles/new-york-v4/<item>.json` (checked for
`button` on 2026-10-02).

## Decision

### Look: shadcn new-york-v4, verbatim

- Classes are copied from the shadcn new-york-v4 registry item, including
  its `data-slot` attributes, which some of shadcn's selectors rely on
  (`has-data-[slot=…]`).
- Changes are allowed only where Angular or Ndop's architecture needs them:
  React-only constructs (`asChild`, Radix `Portal`) map to Ndop's directive
  and portal parts, and lucide React icons become `ndIcon` (ADR-0013). Each
  change is noted in a comment in the item.
- Every styled file starts with a comment crediting shadcn/ui (MIT) and
  naming the source item and the date it was copied.
- A parity test per item compares its `variants()` table with the class
  strings in the fetched shadcn source, so drift on either side is caught.
  The shadcn sources are vendored next to the shadcn schema snapshot
  (ADR-0002) and refreshed deliberately.

### Shape (ADR-0005)

`registry/ui/<name>/<name>.ts`: one file, directives only, each composing its
primitive through `hostDirectives` with the primitive's selector, a
`variants()` table, a `class` input merged last through `cn()` from
`@/lib/utils`, and re-exports of the primitive parts it wraps. Class names
drop the `Nd` prefix (`Button`, `DialogContent`), as in RFC-0001's example.

### Default theme

`registry/themes/default` becomes a `registry:theme` item: the token blocks
from Phase 1 plus the fonts from ADR-0006 amendment 1 (Geist and Geist Mono
through `@fontsource-variable/*`, imports in the item's `css`).

### Examples

- `registry/examples/<item>-<case>.ts`: standalone components, type
  `registry:primitive-usage`, at least two per item, one of them realistic
  (for example a dialog with a Signal Forms form).
- The harness routes every example at `/examples/<name>` and links each one
  from its home page, so the existing e2e quality crawl covers them: server
  rendering, hydration without console errors, and axe.
- Styled items get unit tests for their variants and class merging.

## Consequences

- Ndop's components look like shadcn's from the first release, and the
  parity tests show exactly where they differ.
- Following shadcn's later visual changes is a deliberate re-copy, recorded
  by the date in each file.

## Amendment 1 (2026-10-03): no notices in registry files

Status: Accepted; requested by Valery on 2026-10-03.

Registry files no longer start with a comment crediting shadcn/ui, naming
the copy date and listing the changes. Those files are copied into users'
projects, where the comments are noise. Instead:

- `registry/vendor/shadcn/new-york-v4/README.md` records, per item, the
  copy date and every deliberate difference from shadcn, and where the
  default theme's palette and fonts come from. It stays in the repository
  and doesn't ship.
- **Release blocker:** Ndop doesn't ship before it has a registry-level
  license notice served with the registry (shadcn/ui's MIT terms and any
  other third-party terms), acknowledgements in the README, and a credit
  to shadcn/ui on the docs site. RFC-0001's Phase 7 checklist lists them.

Behavior that users need to know, such as writing the dialog's portal and
overlay themselves, stays in each item's TSDoc and `docs.md`, which ship.
