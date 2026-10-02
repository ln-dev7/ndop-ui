# ADR-0005: Directive-only styled API

- Status: Accepted (approved by Valery on 2026-10-02); Amendment 1 applied
- Date: 2026-10-02
- Phase: 1
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Styled layer, variants and theming"

## Context

RFC-0001 decides that every styled item is a directive on a native element
or on markup the user writes, with no wrapper components. This ADR records
the mechanics, and the Angular behaviors they rely on, checked on
2026-10-02 with throwaway TestBed specs against Angular 22.2.1:

1. A directive input named `class` receives the element's **static**
   `class="…"` attribute and any **bound** `[class]` value. With
   `host: { '[class]': 'classes()' }`, the element keeps the static classes
   and gains the host-bound ones (observed: input `"bg-user"`, DOM
   `"bg-user bg-base"`).
2. Matching a directive both as a `hostDirectives` entry of another directive
   and by its own selector on the same element raises no error.

## Decision

- **Shape.** A styled item is a standalone `@Directive` with the same
  selector as the primitive it styles (for example `button[ndButton]`). It
  composes the primitive through `hostDirectives`, forwarding the
  primitive's inputs, models and outputs, and adds only classes.
- **Classes.** Every styled item has `readonly class = input('')` and binds
  `host: { '[class]': 'classes()' }`, where
  `classes = computed(() => cn(variants(...), this.class()))`. Because of
  fact 1, a user's static or bound classes reach `cn()`, and
  `tailwind-merge` lets them win over conflicting variant classes.
- **One import path.** The styled file re-exports the primitive parts it
  wraps, so an app imports from `@/ui/<item>` only.
- **Compound items** are one directive per part, communicating through the
  primitive's injection-token context, never through `@ContentChild`.
- **Structure lives in user templates.** Items that need structure (Sidebar,
  Data Table, Command) are compositions of directives; blocks show the
  canonical markup.
- **No components in styled items.** Until the `@ndop/eslint-plugin` rule
  lands (Phase 4), `ndop build` (Phase 2) rejects registry items that
  declare `@Component`.

Two follow-ups are required in Phase 1, before the first styled item ships:

- A permanent test in the styled-item test suite that pins fact 1, so an
  Angular upgrade that changes it fails CI instead of silently breaking
  class overrides.
- A test confirming fact 2 creates **one** primitive instance, not two. The
  probe showed no error, not instance identity. If two instances are
  created, the rule becomes "import the styled item or the primitive, never
  both", enforced by lint.

## Consequences

- Styled items stay small and legible: one primitive, one `variants()`
  table, one `class` input.
- Users can apply any utility through `class` without forking the item.
- The two follow-up tests make the decision depend on observed behavior, not
  on assumptions about Angular internals.

## Amendment 1 (2026-10-02): never import a primitive next to its styled item

Status: Applied, as the fallback this ADR already approved; recorded for
review.

The Phase 1 follow-up test ran on both supported majors. Angular 22.2.1
deduplicates a directive that matches both by selector and as a
`hostDirectives` entry. Angular 21.2.25 throws `NG0309` ("Directive …
matches multiple times on the same element"). Since Ndop supports both, the
rule from "Two follow-ups" applies:

- A template imports the styled item, which re-exports the primitive parts
  it wraps, and never the primitive it composes.
- The contract test pins what holds on both versions: each styled element
  creates exactly one primitive instance.
- `@ndop/eslint-plugin` gets a rule against importing a primitive alongside
  a styled item that composes it (Phase 4). Until then the CI `compat` job
  on Angular 21 catches it in Ndop's own code.
