# ADR-0007: Metadata extraction approach

- Status: Accepted (approved by Valery on 2026-10-03)
- Date: 2026-10-03
- Phase: 3
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Agent-native DX" (metadata
  pipeline), Phase 3; ADR-0002 (metadata schema v0)

## Context

RFC-0001 wants one metadata file per component, extracted from compiled
code and merged with the hand-written `spec.md`, feeding the docs,
playground, MCP server, `llms.txt` and `ndop view`. CI must fail when a
public input lacks a description or a spec lacks a keyboard map. ADR-0002
published a v0 metadata schema and left its final shape to this ADR.

Checked on 2026-10-03 against the installed `@angular/compiler-cli` 22.2.1:

- `NgtscProgram.getApiDocumentation(entryPoint, privateModules)` is public
  API (exported from the package root) and is what angular.dev uses for its
  API reference. Run over `registry/ui/dialog/dialog.ts`, it returns every
  directive with its selector, description, and members tagged `input` /
  `output` with their TypeScript type, alias, `required` flag and JSDoc,
  including `model()` (tagged both) and classes re-exported from
  `@ndop/primitives`.
- It does not report: inputs forwarded through `hostDirectives` (Button's
  `disabled` comes from `NdButton`), default values, the options of a
  `variants()` input (only `VariantValue<{ … }>`), or host bindings.

## Decision

### What gets metadata

One file per `registry:ui` item, written by `ndop build` to
`r/metadata/<name>.json` and pointed to by the item's `ndop.metadata`
(ADR-0002). A part is every directive the item's files export, styled or
re-exported primitive, so `dialog.json` documents `NdDialog`,
`NdDialogTrigger`, `DialogContent` and the rest.

### Sources, in order

1. **Angular's documentation extractor** for parts, selectors, `exportAs`,
   descriptions and every input, model and output with type, alias,
   required flag and description. Signal wrapper types are unwrapped
   (`InputSignal<string>` → `string`).
2. **ts-morph, for what the extractor misses:** inputs forwarded by
   `hostDirectives`, documented with the forwarded directive's JSDoc;
   defaults from `input(…)` / `model(…)` initializers; the options of a
   `variants()` input, read from the table's keys, as `values`;
   `data-*` attributes from `host` bindings.
3. **The primitive's `spec.md`**, found next to the entry point of the
   primitive a part composes (`@ndop/primitives/dialog` →
   `packages/primitives/dialog/spec.md` here, the `spec.md` shipped in the
   npm package elsewhere): WAI-ARIA pattern, roles, ARIA and data
   attributes, keyboard map, focus rules, RTL behavior. `@ndop/primitives`
   ships its `spec.md` files for third-party registries.
4. **A hand-written `docs.md` next to the item**
   (`registry/ui/<name>/docs.md`): a short intro, then `## Do` and
   `## Don't` lists, the agent notes. It is prose only; every code sample
   on the site comes from a compiled example.
5. **The registry item** for examples: the first entry of `ndop.examples`
   is the main example, used for the hero preview and the usage snippet.

The bundle size badge is measured here too: the item's files bundled with
esbuild, Angular and `@ndop/*` peers external, minified and gzipped.

### Schema v1

`metadata.json` keeps v0's shape and adds:

| Field                     | Meaning                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `title`, `description`    | From the registry item.                                      |
| `intro`                   | Markdown from `docs.md`.                                     |
| `agentNotes`              | `{ do: string[], dont: string[] }` from `docs.md`.           |
| `parts[].source`          | Where the part comes from: `item` or a primitive entry.      |
| `parts[].inputs[].values` | Allowed values of enum-like inputs, for playground controls. |
| `bundleSize`              | `{ gzip: number }` in bytes.                                 |

`dataAttributes[].description` becomes optional, since `spec.md` names
data attributes without describing each one.

### The completeness rule

`ndop build` fails when a `registry:ui` item has a part or a public input,
model or output without a description, when the primitive it composes has
no `spec.md` or an empty keyboard map, or when its `docs.md` is missing an
intro, `## Do` or `## Don't`. Failures name the file and member, like the
other build checks. Third-party registries without `docs.md` can turn the
rule off with `--no-metadata`.

### Where the code lives

`@ndop/metadata` holds the extractor (`extractMetadata(root, items)`), the
`spec.md` parser it already has, and the `docs.md` parser. `@ndop/cli`
calls it from `ndop build`.

## Consequences

- One code path documents every surface, and the extractor Angular itself
  uses keeps types and descriptions exact.
- The ts-morph layer is small but couples to Ndop's conventions
  (`hostDirectives`, `variants()`); new conventions need a matching
  extractor change.
- `ndop build` now needs `@angular/compiler-cli`, which it already uses for
  the compile check.

## Amendment 1 (2026-10-03): the TypeScript program instead of ts-morph

Status: Accepted by Valery on 2026-10-03.

What the documentation extractor misses (forwarded inputs, defaults, enum
values, host data attributes) is read from the TypeScript program that
Angular's `NgtscProgram` builds, through its type checker, instead of from
ts-morph. Enum values need the checker: `NdSide`, for example, is an alias
declared in another package, and ts-morph would parse and type-check every
file a second time to resolve it. This replaces "ts-morph" in "Sources, in
order", item 2; the decision is otherwise unchanged.
