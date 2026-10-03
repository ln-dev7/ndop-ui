# ADR-0013: Icons adapter on `@lucide/angular`

- Status: Accepted (approved by Valery on 2026-10-02); deviates from RFC-0001 on the package name
- Date: 2026-10-02
- Phase: 2
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Icons (decided)"

## Context

RFC-0001 makes styled items icon-agnostic: they ask a resolver for semantic
names (`x`, `chevron-down`, `check`) through `provideNdopIcons(resolver)` in
`@ndop/core`, and `ndop init` installs lucide-angular and registers its
resolver by default. Phase 2 needs this for Dialog, whose shadcn styling has a
close icon (`XIcon`); the other six Phase 1 items use no icons.

Checked on 2026-10-02:

- `lucide-angular` 1.0.0 is **deprecated** on npm ("Package deprecated.
  Please use @lucide/angular instead") and peers on Angular 13.x to 21.x
  only, so it can't be installed cleanly on Angular 22.
- `@lucide/angular` 1.50.0 (published the same day, ISC license) peers on
  Angular `>=17`, is standalone, signal-based and zoneless. Each icon is a
  component on `svg[lucide<Name>]`, and each component class carries its
  data statically, for example `LucideX.icon`:
  `{ name: 'x', size: 24, node: [['path', { d: 'M18 6 6 18' }], …] }`.

## Decision

- **Deviation:** the default icon library is `@lucide/angular`, not
  `lucide-angular`. The RFC's "Icons" section is updated on acceptance.
- `@ndop/core` adds:
  - `NdIconData`, the same node format Lucide uses
    (`[tag, attributes, children?]`), so other libraries can adapt to it;
  - `provideNdopIcons(icons)`, taking a record of semantic name to data;
  - `NdIcon`, a directive on `svg[ndIcon]` that renders the resolved nodes
    with `Renderer2` (SSR-safe), sets `viewBox`, `fill="none"`,
    `stroke="currentColor"` and the Lucide stroke defaults, and
    `aria-hidden="true"` unless the svg has an accessible name. Size and
    color come from classes, as in shadcn (`size-4`).
- The Lucide resolver is a registry `lib` item, `icons`, that `ndop init`
  installs: `{lib}/icons.ts` maps Ndop's semantic names to `Lucide*.icon`.
  It is the user's file, so swapping libraries means editing one file.
  `iconLibrary: "lucide"` in `ndop.json` records the choice; other values are
  rejected until a second resolver exists.
- Styled items reference icons only by semantic name:
  `<svg ndIcon="x" class="size-4"></svg>`.

## Consequences

- `@ndop/core` stays free of any icon dependency.
- Phase 2 needs one semantic name, `x`; the set grows with the catalog.
