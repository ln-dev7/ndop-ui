# ADR-0030: Compiled guide code

- Status: Accepted (approved by Valery on 2026-10-13); deviates from
  RFC-0001's docs quality bar (see "Deviation")
- Date: 2026-10-13
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Docs quality bar"; ADR-0014,
  ADR-0016, ADR-0029

## Context

RFC-0001 says: "No example code on the site that isn't compiled and tested
in CI." Component examples meet it: each is a registry file, compiled with
strict templates and tested (ADR-0014). Guides don't. They are Markdown
(ADR-0016), and their fenced code blocks were never compiled; a unit test
only checked that the `nd…` names, `ndop add` items and component links
they mention exist in the built registry. Running a compiler over them on
2026-10-13 found four of the five TypeScript blocks broken (missing
imports, a class body without its class, an icons import from a path
`ndop init` doesn't write), and the one Ndop template calling a method no
component had.

Guides also hold code that can't compile as Ndop's: Angular Material and
spartan "before" samples, shell commands, CSS, and other tools' config.

## Decision

### Deviation (amends RFC-0001, "Docs quality bar")

The rule becomes: every component example is compiled and tested in CI;
every guide block of Ndop TypeScript or Angular template code is compiled
in CI with strict templates, and every `ndop.json` and `registry.json`
block is validated against its schema. A guide block may opt out only when
it isn't Ndop's code or is a deliberate fragment, and says why. Shell,
CSS and other languages aren't compiled.

### The check

The docs project's `guides` target (executor
`@ndop/workspace-plugin:docs-guides`) reads every
`apps/docs/src/guides/<section>/<page>.md` and:

- writes each `ts`, `typescript` or `angular-ts` block as a file, as is: a
  block is a whole file, imports included;
- writes each `angular-html` block as the template (`templateUrl`) of a
  generated standalone component with no members, which imports the
  directive of every `nd…` attribute the template uses. The directive's
  class and file come from the built registry's metadata (each part's
  selector and the item file exporting its class), `ndIcon` from
  `@ndop/core`. A template that needs component state goes in a `ts` block
  with its component instead;
- compiles them all with `ngc`, `ng new`'s strict options and
  `strictTemplates`, against the registry's items through the `@/` alias of
  `tsconfig.base.json`, as examples and `ndop build` compile; relative
  imports don't resolve, so blocks import by package or `@/`, as an app
  after `ndop init` does;
- validates each `json` block titled `ndop.json` or `registry.json`
  (any folder) with `@ndop/schema`'s `validate`. A block may leave out
  required top-level properties, to show only the part of the file it is
  about; everything it shows must be valid;
- checks, anywhere in a guide, that every `nd…` name is a directive of an
  item, every `ndop add` argument an item (a `theme:` one a theme) and
  every `/docs/components/<name>` link an item. These moved from the docs'
  unit test, which keeps only the roadmap's checks.

Errors are reported at their line in the guide. `ngc` checks templates
only once the TypeScript compiles, so template errors show after
TypeScript ones are fixed.

`docs:typecheck` depends on `guides`, so CI runs it with every
`typecheck`. `guides` depends on `registry:build` for the metadata, and is
cached on the guides, the registry, `@ndop/core`, the primitives,
`@ndop/schema`, `tsconfig.base.json`, the executor, the registry build's
JSON and the compiler's version.

### Opting out

A fence's meta takes `nocheck="reason"`, as in
` ```angular-html title="delete-dialog.html" nocheck="Angular Material's markup" `.

The check fails on a `nocheck` without a reason, and on one on a block it
wouldn't check anyway (shell, CSS, other JSON). Allowed reasons: code of
another library (Angular Material, spartan), and a deliberate fragment,
such as an excerpt with `…`. The docs' Shiki transformer and the `.md`
twins drop the marker, so it never shows on the site.

## Consequences

- Guide code is held to the bar of examples: a renamed input, export or
  config key fails CI at the guide's line.
- Guides show whole files, which are longer than the snippets they had;
  a block that only made sense with surrounding code becomes a component.
- `typecheck docs` now waits for the registry build, as `test docs`
  already did.
- Guides can't use relative imports or reference undeclared state; the
  check names both.
