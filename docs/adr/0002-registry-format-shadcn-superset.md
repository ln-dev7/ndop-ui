# ADR-0002: Registry format as a shadcn superset

- Status: Accepted, with Amendments 1 and 2
- Date: 2026-10-01
- Phase: 0
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Registry spec"

## Context

RFC-0001 requires the Ndop registry format to be a superset of shadcn's
`registry.json` and `registry-item.json` schemas, with Angular-specific fields
added, and requires `ndop build --compat shadcn` to emit items in shadcn's exact
schema.

shadcn's schemas were fetched on 2026-10-01 from
`https://ui.shadcn.com/schema/registry-item.json` and
`https://ui.shadcn.com/schema/registry.json`. Relevant facts:

- Draft-07 JSON Schema. Only `name` and `type` are required. No
  `additionalProperties: false`, so unknown top-level keys are allowed.
- Item `type` enum: `registry:lib`, `block`, `component`, `ui`, `hook`,
  `theme`, `page`, `file`, `style`, `base`, `font`, `item`.
- `files[]` has `path`, `content`, `type`, `target`; `target` is required only
  for `registry:file` and `registry:page`.
- `docs` is a **Markdown string**. `meta` is a free-form object.
- `cssVars` has `theme`, `light`, `dark`. `dependencies` and
  `registryDependencies` are string arrays; registry dependencies accept bare
  names, `@namespace/name` and URLs.
- `registry.json` has `name`, `homepage`, `include`, `items`, `pagination`.

## Decision

### Superset invariant

An Ndop item is a valid shadcn item plus Ndop-only fields. Every field shadcn
defines keeps its exact name, type and meaning in Ndop. This is enforced by a
test in `packages/schema`: for every fixture item, removing Ndop-only fields
and applying the compat type mapping must produce a document that validates
against a vendored snapshot of shadcn's schema. The snapshot lives in
`packages/schema/vendor/shadcn/` with its source URL, fetch date and SHA-256,
and is refreshed deliberately.

### Ndop-only fields

| Field        | Type                                                    | Required                             | Meaning                                                                               |
| ------------ | ------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `version`    | semver string                                           | yes                                  | Item version; recorded in the lockfile and used as the merge base.                    |
| `angular`    | `{ minVersion, providers[], exports[], zoneless, ssr }` | for `ui`, `primitive-usage`, `block` | As in the RFC.                                                                        |
| `migrations` | `[{ from, to }]`                                        | no                                   | Upstream renames and deletions applied before a merge (RFC update algorithm, step 8). |
| `ndop`       | `{ metadata?: string, examples?: string[] }`            | no                                   | Pointers to the item's metadata file and example items.                               |

### Deviation from RFC-0001

The RFC example puts `"docs": { "metadata": ..., "examples": [...] }` on the
item. shadcn already defines `docs` as a Markdown string, so an object there
breaks the superset invariant and would fail shadcn validation in compat mode.

Decision: `docs` keeps shadcn's meaning (an optional Markdown note), and the
RFC's object moves to `ndop: { metadata, examples }`. The RFC's registry item
example is updated in the same PR that lands the schema (RFC rule 6).

Approved by Valery on 2026-10-01.

### Item types

- Ndop uses `registry:ui`, `registry:block`, `registry:theme`,
  `registry:lib`, `registry:style`, `registry:file`, all with shadcn's meaning,
  and adds `registry:primitive-usage` (examples).
- shadcn types Ndop has no use for (`component`, `hook`, `page`, `base`,
  `font`, `item`) are rejected by the Ndop schema, so a typo or a React item
  fails validation instead of installing something the CLI can't handle.

### Stricter rules Ndop adds on top of shadcn

- Required: `name`, `type`, `version`, `title`, `description`; `files` is
  required and non-empty for every type except `registry:theme` and
  `registry:style`.
- `files[].target` is required for every file and must start with an alias
  token: `{ui}`, `{lib}` or `{blocks}`. Tokens resolve from `aliases` in the
  user's `ndop.json`.
- `dependencies` entries are `name` or `name@range`.
- Source manifests (`registry/registry.json`) omit `files[].content`; built
  items under `/r/` always embed it.

### Served layout

Static JSON, as in the RFC: `/r/index.json`, `/r/<name>.json`,
`/r/<name>@<version>.json` (immutable merge base), `/r/metadata/<name>.json`,
and `/r/compat/<name>.json` for shadcn compat.

### shadcn compat mapping (`ndop build --compat shadcn`)

| Ndop                                                                     | shadcn compat                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `version`, `angular`, `migrations`, `ndop`                               | dropped                                                                                                                               |
| `registry:primitive-usage`                                               | `registry:block`                                                                                                                      |
| other types                                                              | unchanged                                                                                                                             |
| `files[].target` with `{ui}`/`{lib}`/`{blocks}`                          | dropped for `ui`, `lib`, `block` (shadcn places them by its own aliases); resolved against Ndop's default aliases for `registry:file` |
| `dependencies`, `registryDependencies`, `cssVars`, `css`, `docs`, `meta` | unchanged                                                                                                                             |

How the shadcn CLI behaves in a non-React (Angular) project is not verified
here. A Phase 6 ADR checks it before the compat build is implemented, as the
RFC requires.

### Schemas published by `@ndop/schema`

| File                 | Describes                        | `$schema` URL                                |
| -------------------- | -------------------------------- | -------------------------------------------- |
| `registry.json`      | Registry index / source manifest | `https://ndop.dev/schema/registry.json`      |
| `registry-item.json` | One item                         | `https://ndop.dev/schema/registry-item.json` |
| `config.json`        | `ndop.json`                      | `https://ndop.dev/schema/config.json`        |
| `lock.json`          | `ndop.lock.json`                 | `https://ndop.dev/schema/lock.json`          |
| `metadata.json`      | `metadata/<name>.json`           | `https://ndop.dev/schema/metadata.json`      |

- Written by hand as draft-07 JSON Schema, the same draft as shadcn's, so
  editors and tooling treat both alike. The JSON files are the source of truth
  because third-party registries consume them.
- TypeScript types are derived from the schemas with `json-schema-to-ts`
  (`FromSchema`); no generated type files to drift.
- Validation uses Ajv with `ajv-formats`.
- `ndop.json` keeps shadcn `components.json` semantics where they overlap:
  `registries` entries are a URL template containing `{name}`, or an object
  with `url` and `headers`, and `${VAR}` in headers expands from the
  environment.
- `ndop.lock.json` v1: `{ lockfileVersion: 1, items: { "<registry>/<name>": {
name, registry, version, files: [{ path, sha256 }] } } }`. The hash is of
  the bytes the CLI wrote (after formatting). ADR-0010 finalizes update-safety
  rules in Phase 5; changes there bump `lockfileVersion`.
- `metadata.json` is a v0 draft in Phase 0 (selector, inputs, models,
  outputs, host bindings, parts, data attributes, keyboard map, ARIA roles,
  focus rules, examples). ADR-0007 finalizes it in Phase 3.

## Consequences

- Teams that know shadcn registries can read and author Ndop items with no
  new concepts beyond `version`, `angular`, `migrations` and `ndop`.
- If shadcn later adds a top-level key that collides with an Ndop-only field,
  the superset test fails on the next snapshot refresh; the fix is an ADR.
- Keeping all non-shadcn doc pointers under one `ndop` key limits future
  collisions to that one name.

## Amendment 1 (2026-10-01): findings from implementing the schemas

Status: Accepted by Valery on 2026-10-02.

1. **Schemas are authored as TypeScript `as const` objects, not `.json`
   files.** `json-schema-to-ts`'s `FromSchema` only infers types from a
   literal-typed schema, and TypeScript widens imported `.json` files. Each
   schema is still a hand-written draft-07 JSON Schema document, now held in
   `packages/schema/src/lib/<name>.schema.ts` and exported as
   `schemas[<name>]`. It stays the single source of truth for both
   validation and types. The docs build (Phase 3) serves each object as JSON at
   its `$id` URL. This replaces "The JSON files are the source of truth"
   above.
2. **`css` is typed by hand.** `FromSchema` fails with TS2589 on the
   recursive `cssValue` definition, so `RegistryItem['css']` uses a small
   recursive `CssValue` type that mirrors the definition. Every other field is
   derived from the schema.
3. **Compat targets map to shadcn placeholders instead of being dropped.**
   shadcn's current schema accepts `@ui/`, `@lib/` and `@components/`
   placeholders in `files[].target`. `toShadcnItem()` maps `{ui}/` to
   `@ui/`, `{lib}/` to `@lib/` and `{blocks}/` to `@components/` (shadcn has
   no blocks alias). This replaces the `files[].target` row of the compat
   mapping table.
4. **shadcn fields Ndop does not accept.** The Ndop item schema sets
   `additionalProperties: false` and leaves out `tailwind` (Tailwind v3
   config; Ndop is v4-only and uses `cssVars`) and `style`, `iconLibrary`,
   `baseColor`, `theme` and `font` (only for shadcn's `registry:base` and
   `registry:font` types, which Ndop rejects). `extends` is kept for
   `registry:style`.
5. **Ajv runs in strict mode except `strictRequired`.** That check flags
   `required` inside conditional `then`/`else` blocks even when the parent
   schema declares the property.

## Amendment 2 (2026-10-08): compat output as universal items

Status: Accepted (approved by Valery on 2026-10-08).

The shadcn CLI (4.21.4) can't create a `components.json` in an Angular CLI
project, and installs `registry:ui` items only with one. It installs
"universal" items (type `registry:item`, files `registry:file` with `~/`
targets) anywhere. So `ndop build --compat shadcn` emits universal items
with relative imports, as ADR-0025 decides, and replaces
`toShadcnCompat`'s type mapping and `@ui/` placeholders.
