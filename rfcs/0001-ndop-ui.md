# RFC-0001: Ndop UI — An Agent-Native, Signals-First Component Ecosystem for Angular

Oct 1, 2026 · @Valery

Ndop UI is a shadcn-style ecosystem for Angular: owned code, a registry, a CLI that can safely update code you've edited, and docs and tooling built for both humans and coding agents.

| Field          | Value                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RFC            | 0001                                                                                                                                                                                                                       |
| Name           | Ndop UI (package scope `@ndop`, CLI `ndop`, selector prefix `nd`). Ndop is the indigo royal cloth of Cameroon's Grassfields, covered in repeated geometric motifs: a shared pattern language every app weaves its own way. |
| Target Angular | v21+ (current major and the one before it)                                                                                                                                                                                 |
| Implementer    | Claude Code, phase by phase (see Implementation plan)                                                                                                                                                                      |

## How to use this RFC (instructions for the implementing agent)

1. Treat every **MUST** as a hard requirement and every **SHOULD** as the default unless an ADR records a reason to deviate.
2. Work one phase at a time. A phase is done only when all of its acceptance criteria pass in CI, not when the code compiles.
3. Before writing code in a new area, write a short ADR in `docs/adr/NNNN-title.md` (context, decision, consequences). The ADR index at the end lists the ones expected.
4. Never invent APIs for Angular, `@angular/aria`, CDK, Tailwind or Analog. Check the installed version's docs or source. If a feature this RFC assumes is missing or different, write an ADR and pick the closest supported approach.
5. Keep the repo green: every PR passes lint, type-check, unit, a11y and registry e2e checks.
6. When this RFC and the code disagree, update the RFC in the same PR. It is the source of truth for intent.

### Code documentation rules (MUST)

Document the contract and the reasoning; never narrate the code.

- **Every exported symbol is documented with TSDoc:** directives, components, functions, types, injection tokens, CLI commands and MCP tools. Each block states what the symbol is for, its inputs/parameters and return value, notable behavior (keyboard, focus, SSR, side effects), and an `@example` for public APIs. Link the relevant `spec.md`, ADR or WAI-ARIA pattern with `@see`.
- **These docs are product surface.** The metadata extractor turns them into the docs site, MCP answers and `llms.txt`, so write them for a user of the API, not for a reviewer of the diff.
- **Inline comments explain why, never what.** Allowed: a non-obvious constraint, a browser or framework quirk, a workaround with a link to the upstream issue, a performance or accessibility reason, a pointer to an ADR. Forbidden: comments that restate the next line.
- **No commented-out code, no `TODO` without an issue link, no changelog-style comments** ("added X", "fixed Y"). History lives in git.
- **Each package has a README** covering purpose, install, the smallest usage example and links to its docs page.
- **Enforced in CI:** ESLint TSDoc/JSDoc rules require docs on every export; the metadata check fails on missing descriptions.

```ts
// Bad: states the obvious
// Set open to true
this.open.set(true);

// Good: explains a decision the code can't show
// Restore focus after the overlay detaches; restoring earlier lets the CDK
// focus trap steal it back on Safari. See ADR-0004.
afterNextRender(() => this.trigger.focus());
```

### Commits and attribution (MUST)

The implementing agent never commits. Valery reviews every change and commits it himself, signed with his GPG key.

- **Never run** `git commit`, `git commit --amend`, `git tag`, `git push`, `git rebase` or anything that rewrites history. Leave changes in the working tree.
- **At the end of each logical unit of work**, hand over in the chat, for each proposed commit: the commit message and the exact `git add` command for its files. Split work into commits that each build and pass tests on their own.
- **Format: Conventional Commits.** `type(scope): subject` with an imperative subject of at most 72 characters; a body explaining what changed and why, wrapped at 72; footers for issue references and `BREAKING CHANGE:`. Scopes match package names: `primitives`, `core`, `cli`, `mcp`, `metadata`, `docs`, `registry`, `eslint-plugin`, `schema`, `repo`.
- **No AI attribution anywhere in commits.** Commit messages must never mention Claude, Claude Code, Anthropic, AI or "generated", and must carry no `Co-Authored-By` or similar trailers. If the tooling has a commit-attribution setting, turn it off in the project settings.
- The same rule applies to Changesets entries and release notes the agent drafts.

Example hand-off:

```text
git add packages/primitives/src/dialog packages/primitives/src/index.ts

feat(primitives): add dialog primitive

Implements the WAI-ARIA modal dialog pattern on CDK overlay and focus
trap: controlled and uncontrolled open state, Escape to close, focus
restored to the trigger, and data-state attributes for styling.

Refs: #12
```

### Nx-first workflow (MUST)

Use Nx's generators, executors and conventions for all scaffolding and tasks. Never hand-write what a generator produces.

- **Generate, don't hand-write.** Apps, libraries, components, directives, services, executors, generators and plugins are created with `nx g` from the official plugins (`@nx/angular`, `@nx/js`, `@nx/node`, `@nx/plugin`, `@nx/playwright`, `@nx/vite`) and the Analog Nx plugin for the docs app.
- **Check before generating.** Read the options with `nx g <plugin>:<generator> --help` instead of guessing flags, run with `--dry-run` first, and show me the planned files.
- **Ndop's own scaffolding is a local plugin.** Repeatable shapes become generators in a workspace plugin (`tools/workspace-plugin`): `primitive` (folder, `spec.md`, directive, tests), `styled-item`, `example`, `block`, `theme`. Every new component is created through them so they all look the same.
- **Custom build steps are Nx executors or inferred targets** in that plugin, never ad-hoc scripts. This covers the registry build, metadata extraction, registry e2e, size checks and agent evals.
- **Tasks run through Nx.** Use `nx run`, `nx run-many` and `nx affected` in CI, with Nx caching. Tags and `@nx/enforce-module-boundaries` implement the dependency rules in the Architecture section.
- **Nx's layout wins.** Follow the conventions of the workspace preset for project locations, `project.json`/`package.json` targets, tsconfig paths and naming. Where the folder tree in this RFC conflicts with them, Nx's convention wins and ADR-0001 records the mapping.
- **Upgrade with `nx migrate`**, never by bumping versions by hand.
- If the Nx MCP server or Nx editor integration is available, use it to inspect the project graph, generator schemas and task configuration.

## Summary and thesis

Ndop UI is the agent-native, signals-first component distribution system for modern Angular. You own the code, and Ndop solves the problem shadcn never did: updating code you own.

shadcn won on three ideas, and Ndop keeps all three:

1. **Ownership.** Styled components are copied into the app's repo, not hidden in `node_modules`.
2. **Distribution as a registry.** A JSON spec plus a CLI, so anyone can publish components and blocks.
3. **Legibility.** Plain, local, boring code that humans and agents both read and edit fluently.

Ndop adds four things on top:

- **Safe updates for owned code.** A lockfile records the version each file was installed from, and `ndop update` does a three-way merge between that base, the user's edits and upstream.
- **Angular done properly.** Directive-first APIs, signals, zoneless, SSR and hydration safe, Signal Forms integration, behavior built on `@angular/aria` and the CDK.
- **Agent-native from day one.** One compiler-extracted metadata source feeds the docs, an MCP server, `llms.txt`, per-project agent context files and a `verify` loop agents can run on their own output.
- **A documentation site that is a product.** Live, tested examples, a generated props playground, a theme studio, keyboard and ARIA tables, and copy-for-agent on every page.

## Goals, non-goals and success metrics

The bar: a developer goes from `ng new` to a themed, accessible, production-quality screen in under 10 minutes, and an agent can do the same without hallucinating an API.

**Goals**

- G1. A primitives package with complete keyboard, focus and ARIA behavior for the v1 catalog.
- G2. A styled, copy-in layer with tokens, variants and dark mode, owned by the user.
- G3. A registry spec and CLI covering `init`, `add`, `list`, `view`, `diff`, `update`, `doctor`, `verify`, `build`.
- G4. Three-way-merge updates that apply cleanly in most cases and fail loudly with conflict markers otherwise.
- G5. Agent tooling: MCP server, `llms.txt`, per-component Markdown, generated `AGENTS.md`, and `ndop verify`.
- G6. A documentation site whose interactivity, speed and polish beat shadcn/ui, Radix and Angular Material docs.
- G7. Third parties can host their own registries and blocks with zero changes to the CLI.

**Non-goals (v1)**

- No support for NgModule-based apps or Angular versions older than the two supported majors.
- No CSS-in-JS or non-Tailwind styling layer. Tokens are CSS variables, so other styling can come later.
- No visual drag-and-drop builder. Blocks and the theme studio cover that need for now.
- No paid tier or license gating. Everything is MIT.
- No Figma plugin in v1. Token export is JSON so a plugin can be added later.

**Success metrics**

| Metric                  | Target                                                   | How it's measured                                   |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Time to first component | < 2 min from `npx ndop init`                             | Scripted e2e run in CI on a fresh `ng new` app      |
| Clean update rate       | ≥ 90% of `ndop update` runs with no conflicts            | Fixture suite of realistic local edits              |
| Accessibility           | 0 axe violations; full keyboard spec per component       | Automated a11y tests                                |
| Docs performance        | Lighthouse ≥ 95 on every page; LCP < 1.5 s               | Lighthouse CI                                       |
| Agent accuracy          | ≥ 95% of generated snippets pass `ndop verify`           | Eval suite of 50 prompts run against the MCP server |
| Bundle cost             | Button < 2 kB gzip; Dialog < 8 kB gzip                   | Size-limit check per component                      |
| Adoption (post-launch)  | 1,000 GitHub stars and 3 external registries in 6 months | GitHub, registry directory                          |

## Landscape and differentiation

Angular already has shadcn-inspired projects, so Ndop wins on the update story, agent tooling and docs quality, not on component count. The table is a positioning summary from general knowledge; verify each project's current state before publishing comparisons.

| Project                | Model                                                    | Where Ndop differs                                                                                    |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| shadcn/ui (React)      | Copy-in styled components on Radix, registry + CLI + MCP | Ndop is Angular-native and adds three-way-merge updates                                               |
| spartan/ui             | Headless "brain" package + copy-in "helm" styles         | Ndop builds on `@angular/aria`, is signals- and zoneless-first, ships agent tooling and merge updates |
| ng-primitives          | Headless primitives library                              | Ndop adds the styled copy-in layer, registry, CLI and blocks                                          |
| Angular Material / CDK | Installed, opinionated Material design                   | Ndop is unstyled-by-default ownership; it uses the CDK rather than competing with it                  |
| PrimeNG and similar    | Large installed suites with theming                      | Ndop favors ownership and small surface over breadth                                                  |

**Positioning line:** "Own your components. Update them anyway. Built for you and your agent."

## Architecture overview

Behavior ships as a versioned npm package; styling and composition are copied into the user's repo. Bug fixes in hard, safety-critical code (focus, keyboard, ARIA, overlays) reach everyone through `npm update`. The parts people customize are theirs.

&#91;embedded content: Ndop UI architecture · 4 runtime layers, 1 build pipeline\]

The two top layers are copied into the user's repo; the two bottom layers update through npm. The CLI, MCP server, docs and agent context all read the same built JSON, so they can never disagree.

**Packages and apps**

| Package / app                    | Distribution                         | Responsibility                                                                |
| -------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `@ndop/primitives`               | npm, semver                          | Headless directives: state, keyboard, focus, ARIA, overlay wiring. No styles. |
| `@ndop/core`                     | npm, semver                          | `cn()`, `variants()`, token helpers, `provideNdop()` config, icons adapter    |
| `registry/` (styled UI + blocks) | Copied in by the CLI                 | Tailwind-styled directives/components, examples, blocks                       |
| `ndop` (CLI)                     | npm, `npx ndop` + `ng add @ndop/cli` | init, add, diff, update, doctor, verify, build                                |
| `@ndop/mcp`                      | npm, `npx @ndop/mcp`                 | MCP server over the registry and metadata                                     |
| `@ndop/metadata`                 | Build-time tool                      | Extracts component APIs from compiled code into `metadata.json`               |
| `apps/docs`                      | Website                              | Analog-based docs, playground, theme studio, llms.txt                         |

**Dependency rules (MUST, enforced by Nx module boundaries)**

- Styled registry items may import `@ndop/primitives`, `@ndop/core`, `@angular/*` and other registry items by alias. Nothing else.
- Primitives may import `@angular/core`, `@angular/aria`, `@angular/cdk`. Never Tailwind, never registry code.
- The CLI, MCP server and docs read the registry through the built `registry.json` and `metadata.json` only, never by importing component source.

## Primitives layer (`@ndop/primitives`)

Primitives are headless, directive-first and signal-driven; they own behavior and accessibility, and render no styles or wrapper elements.

**API conventions (MUST)**

- **Directive-first.** Prefer attribute selectors on native elements: `button[ndButton]`, `input[ndInput]`. Use a component only when Ndop must render its own DOM (for example a toast region).
- **Composition via `hostDirectives`.** A trigger composes behavior, e.g. a tooltip trigger composes an overlay origin and an ARIA describedby directive, rather than inheriting.
- **Signals everywhere.** `input()`, `input.required()`, `model()` for two-way state (`open`, `value`, `checked`), `output()` for events, `computed()` for derived state. No `@Input()` decorators, no `EventEmitter`, no RxJS in public APIs.
- **Zoneless and OnPush safe.** Every primitive works in an app using `provideZonelessChangeDetection()`. No `setTimeout`-based change detection hacks.
- **SSR and hydration safe.** No direct `window`/`document` access outside `afterNextRender` or injected `DOCUMENT`; no layout reads during SSR.
- **Build on `@angular/aria` and the CDK.** Use Angular Aria patterns (listbox, menu, tabs, combobox, etc.) and CDK overlay, a11y and focus-trap utilities where they exist. Write custom behavior only where neither covers the pattern, and record it in an ADR.
- **State exposed as data attributes.** `data-state="open|closed"`, `data-disabled`, `data-highlighted`, `data-orientation`, so styles never reach into private APIs.
- **Context via DI.** Compound parts (Dialog, Trigger, Content, Title) communicate through an injection token that provides a signal-based context, never through `@ContentChild` chains.
- **Controlled and uncontrolled.** Every stateful primitive works with `[(open)]` binding or with no binding (internal default from a `defaultOpen` input).
- **Forms.** Value-bearing primitives that own their value integrate with Signal Forms first and also implement `ControlValueAccessor` for reactive and template-driven forms. Primitives on native form elements (`input[ndInput]`) leave the value to the forms library and only read its state (ADR-0004, amendment 1). Disabled, touched and invalid states map to ARIA and data attributes.
- **Naming.** Directive classes `Nd<Part>` in primitives (e.g. `NdDialogTrigger`), selector prefix `nd`. Exported tokens `ND_<NAME>`.

**Accessibility contract per primitive (MUST be written before code)**

Each primitive has a `spec.md` in its folder listing: the WAI-ARIA pattern it implements, roles and attributes on each part, the full keyboard map, focus behavior on open and close, and RTL behavior. Tests are generated from or checked against this file, and the docs keyboard table renders from it.

**Example shape**

```ts
@Directive({
  selector: '[ndDialogTrigger]',
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open()',
    '[attr.aria-controls]': 'ctx.contentId',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '(click)': 'ctx.toggle()',
  },
})
export class NdDialogTrigger {
  protected readonly ctx = inject(ND_DIALOG);
}
```

## Styled layer, variants and theming

Styled items are small, boring files the user owns: one primitive (or native element), a `variants()` table and a `class` input merged last.

**Styled conventions (MUST)**

**Directive-only (decided).** Every styled item is a directive applied to a native element or to markup the user writes. The styled layer ships no wrapper components. Parts that need structure (Sidebar, Data Table, Command) are composed from directives in the user's own template, and blocks show the canonical markup.

- Tailwind CSS v4, CSS-first config (`@theme`), no `tailwind.config.js` required.
- All colors, radii, shadows and motion come from CSS variables. No raw palette classes (`bg-zinc-900`) inside registry items; use semantic utilities (`bg-primary`, `text-muted-foreground`).
- `variants()` in `@ndop/core` mirrors the cva API (base, variants, compoundVariants, defaults) and returns a typed function; variant prop types are derived from it.
- A `class` input on every styled item, merged with `cn()` (clsx + tailwind-merge) so user classes always win.
- One file per component where possible; at most one `.ts` plus one `.css` for animations. No barrel files that hide where things live.
- Styled items re-export the primitive parts they wrap so users import from one local path, e.g. `@/ui/dialog`.

```ts
const buttonVariants = variants({
  base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border border-input bg-background hover:bg-accent',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    size: { sm: 'h-8 px-3', md: 'h-9 px-4', lg: 'h-10 px-6', icon: 'size-9' },
  },
  defaults: { variant: 'default', size: 'md' },
});

@Directive({
  selector: 'button[ndButton], a[ndButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly variant = input<VariantOf<typeof buttonVariants, 'variant'>>('default');
  readonly size = input<VariantOf<typeof buttonVariants, 'size'>>('md');
  readonly class = input('');
  protected readonly classes = computed(() => cn(buttonVariants({ variant: this.variant(), size: this.size() }), this.class()));
}
```

**Token system**

- Three tiers: primitive tokens (raw OKLCH scales), semantic tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, chart and sidebar sets), and component tokens only where a component genuinely needs one.
- Token names stay compatible with shadcn's so existing shadcn themes paste in unchanged. This is a deliberate interoperability decision.
- Dark mode via a `.dark` class and `prefers-color-scheme`; `provideNdop({ theme: 'system' | 'light' | 'dark' })` manages the class with SSR-safe defaults.
- Motion tokens (`--duration-*`, `--ease-*`) and a global `prefers-reduced-motion` override.
- Density (`compact`, `default`, `comfortable`) as a token set, switchable per subtree with a `data-density` attribute.
- RTL: logical properties only (`ms-*`, `pe-*`, `start-*`). No `left`/`right` utilities in registry items; lint enforces it.

**Themes as registry items**

A theme is a registry item of type `registry:theme` containing CSS variables. `ndop add theme:<name>` or `ndop init --theme <url>` installs one; the theme studio on the docs site produces the same format.

**Icons (decided): icon-agnostic, Lucide (`@lucide/angular`) by default**

- No styled item imports an icon library directly. Icons enter through content projection (`<svg ndIcon>` or any icon component the user prefers) or through a small `NdIcon` adapter directive.
- `@ndop/core` exposes `provideNdopIcons(resolver)`; built-in items that need an icon (chevrons, close, check) ask the resolver by semantic name (`chevron-down`, `x`, `check`).
- `ndop init` installs `@lucide/angular` and registers its resolver by default (ADR-0013: `lucide-angular` is deprecated and stops at Angular 21). `iconLibrary` in `ndop.json` lets users switch; the CLI then rewrites icon imports in items it installs.

## Registry spec

The registry format is a superset of shadcn's `registry.json` / `registry-item.json` schema, extended with Angular-specific fields, so the ecosystem's existing tooling and habits carry over.

**Item types:** `registry:ui`, `registry:primitive-usage` (examples), `registry:block`, `registry:theme`, `registry:lib`, `registry:style`, `registry:file`.

**Registry item shape (example)**

```json
{
  "$schema": "https://ndop.dev/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "version": "1.3.0",
  "title": "Dialog",
  "description": "A modal window that interrupts the user and requires a response.",
  "dependencies": ["@ndop/primitives@^1.2.0"],
  "registryDependencies": ["button", "@ndop/utils"],
  "files": [{ "path": "ui/dialog/dialog.ts", "type": "registry:ui", "target": "{ui}/dialog/dialog.ts" }],
  "cssVars": { "light": {}, "dark": {} },
  "angular": {
    "minVersion": "21.0.0",
    "providers": [],
    "exports": ["Dialog", "DialogTrigger", "DialogContent", "DialogTitle", "DialogDescription", "DialogClose"],
    "zoneless": true,
    "ssr": true
  },
  "ndop": { "metadata": "metadata/dialog.json", "examples": ["dialog-demo", "dialog-form"] }
}
```

**Rules (MUST)**

- Every item has a `version` (semver). The CLI records it in the user's lockfile; that recorded version is the merge base for updates.
- Files are addressed by path aliases (`{ui}`, `{lib}`, `{blocks}`) resolved from the user's `ndop.json`, never hard-coded paths.
- `registry:block` items may include routes, services and data adapters (`resource()`/`httpResource()` stubs) but MUST compile with mock data out of the box.
- Namespaced registries: `ndop add @acme/data-table` resolves through `registries` in `ndop.json` (URL template plus optional auth header from an env var). Private registries work the same way.
- The registry is served as static JSON: `/r/index.json`, `/r/<name>.json`, `/r/<name>@<version>.json` (immutable, used as the merge base), plus `/r/metadata/<name>.json`.
- `ndop build` validates items against the JSON schema, compiles them in a scratch app, and fails on any import that breaks the dependency rules.

**shadcn-compat mode (decided)**

- `ndop build --compat shadcn` also emits every item in shadcn's exact `registry-item.json` schema under `/r/compat/`, with Angular-only fields dropped and file types mapped to shadcn's (`registry:ui`, `registry:lib`, `registry:block`).
- Goal: teams already using the shadcn CLI or shadcn-aware tools can install Ndop items with `npx shadcn add https://ndop.dev/r/compat/dialog.json`.
- Three-way-merge updates, Angular AST edits and agent context stay Ndop-CLI features; the compat output is files and dependencies only.
- Verify the shadcn CLI's current behavior for non-React projects in an ADR before building, and cover compat installs in the registry e2e.

**User config: `ndop.json`**

```json
{
  "$schema": "https://ndop.dev/schema/config.json",
  "style": "default",
  "tailwind": { "css": "src/styles.css", "prefix": "" },
  "aliases": { "ui": "src/app/ui", "lib": "src/app/lib", "blocks": "src/app/blocks" },
  "importAlias": "@/",
  "iconLibrary": "lucide",
  "registries": { "@acme": { "url": "https://ui.acme.dev/r/{name}.json", "headers": { "Authorization": "Bearer ${ACME_TOKEN}" } } }
}
```

**Lockfile: `ndop.lock.json`** (committed)

For each installed item: name, registry, version, and for each file the path and a SHA-256 of the content as installed. This is what makes `diff` and `update` possible.

## CLI (`ndop`)

The CLI is AST-aware, idempotent and previewable: every write can be shown as a diff first (`--dry-run`), and running a command twice changes nothing the second time.

**Commands**

| Command                          | What it does                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ndop init`                      | Detects Angular version, standalone setup, zoneless, SSR, Tailwind v4 and path aliases; writes `ndop.json`, base CSS tokens, `cn`/`variants` utils, `provideNdop()` in `app.config.ts`, and `AGENTS.md` + agent context files. Flags: `--theme`, `--yes`, `--agent` (claude-code, cursor, copilot or none). |
| `ndop add <items...>`            | Resolves registry dependencies, installs npm deps with the detected package manager, writes files via aliases, rewrites imports, records versions and hashes in the lockfile, refreshes agent context.                                                                                                      |
| `ndop list` / `ndop view <item>` | Browse the registry; `view` prints the item's API, examples and keyboard map in the terminal.                                                                                                                                                                                                               |
| `ndop diff [item]`               | Shows local edits (vs. installed base) and available upstream changes (base vs. latest), side by side.                                                                                                                                                                                                      |
| `ndop update [items...]`         | Three-way merge updates (below). `--interactive` lets the user pick hunks.                                                                                                                                                                                                                                  |
| `ndop doctor`                    | Checks versions, Tailwind setup, tokens, aliases, lockfile drift, missing peer deps, zoneless/SSR config. Prints fixes; `--fix` applies safe ones.                                                                                                                                                          |
| `ndop verify [paths...]`         | Type-checks, lints, runs axe and a Playwright screenshot on the given components or pages. Built for agents (see Agent-native DX).                                                                                                                                                                          |
| `ndop build`                     | For registry authors: validates and emits static registry JSON, metadata and versioned snapshots.                                                                                                                                                                                                           |
| `ng add @ndop/cli`               | Schematic wrapper that runs `ndop init` for teams that prefer Angular CLI flows.                                                                                                                                                                                                                            |

**Code modification (MUST)**

- Use the TypeScript compiler API (via ts-morph) or Angular schematics' AST utilities for edits to `.ts` files: adding providers to `app.config.ts`, imports to standalone components, path aliases to `tsconfig.json`. No regex or string-replace on TypeScript.
- Use a JSONC-preserving editor for `tsconfig`/`angular.json` so comments and formatting survive.
- Format written files with the project's Prettier config if one exists.
- Every command supports `--cwd`, `--dry-run`, `--json` (machine-readable output for agents and CI) and `--yes`.

**Three-way merge update algorithm**

This is the flagship feature. For each file of each item being updated:

1. Read `base` = the file at the version recorded in `ndop.lock.json` (fetched from the immutable `/r/<name>@<version>.json`).
2. Read `local` = the file on disk, and `remote` = the file at the target version.
3. If `hash(local) == lockfile hash`, the user never edited it: replace with `remote` (fast path).
4. If `base == remote`, nothing changed upstream: skip.
5. Otherwise run a line-based three-way merge (diff3 semantics, as `git merge-file`). As a refinement, for `.ts` files try a structural pass first: merge class members, host bindings and the `variants()` object by key, then fall back to line merge for anything it can't place.
6. Clean merge: write the result. Conflict: write standard `<<<<<<< local` / `=======` / `>>>>>>> ndop@x.y.z` markers, exit non-zero, and print a summary of each conflict with its file and line.
7. Update the lockfile only for files that merged cleanly or were resolved; record the new version and hash.
8. Handle renames and deletions upstream via a `migrations` field on the item (`{ from: 'old/path.ts', to: 'new/path.ts' }`) and codemods for breaking API changes, run before the merge.
9. Before writing anything, require a clean git working tree for affected files (or `--force`), so `git checkout` is always an undo.

The update result is reported as a table (item, from version, to version, files clean / merged / conflicted) and, with `--json`, as structured output an agent can act on.

## Agent-native DX

One metadata file per component, extracted from compiled code, feeds every surface: docs, playground, MCP, `llms.txt`, terminal `view` and the project's agent context. Nothing is documented by hand twice, so nothing drifts.

**Metadata pipeline (`@ndop/metadata`)**

- Runs at build time over the registry using the Angular compiler's analysis (or ts-morph over signal APIs as a fallback) to extract: selector, inputs (name, type, default, required), models, outputs, host bindings, exported parts, data attributes, and JSDoc.
- Merges in the hand-written `spec.md` (keyboard map, ARIA roles, focus rules) and the example list.
- Emits `metadata/<name>.json` against a published JSON schema. CI fails if a public input lacks a description or a spec is missing a keyboard map.

**MCP server (`@ndop/mcp`)**

| Tool                                         | Purpose                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `search_components(query)`                   | Semantic plus keyword search over names, descriptions and use cases                                       |
| `get_component(name)`                        | API, parts, keyboard map, a11y notes, do/don't, and the minimal correct usage                             |
| `get_example(name)`                          | Full source of a named, tested example                                                                    |
| `list_blocks(category?)` / `get_block(name)` | Page-level compositions with their dependencies                                                           |
| `add_items(names[], cwd)`                    | Runs `ndop add` and returns the files written                                                             |
| `get_project_context(cwd)`                   | Installed items, versions, local edits, aliases, theme tokens                                             |
| `validate_usage(file)`                       | Checks a template against metadata: unknown inputs, missing required parts, wrong nesting, missing labels |
| `verify(paths[])`                            | Runs `ndop verify` and returns structured results                                                         |

The server also exposes resources (`ndop://components/<name>`, `ndop://tokens`) and a prompt (`build-screen`) that walks an agent through choosing blocks and components.

**Machine-readable docs**

- `/llms.txt` (index) and `/llms-full.txt` (everything), regenerated on every build.
- Every docs page has a `.md` twin (`/docs/components/dialog.md`) and a "Copy page for agent" button that copies it.
- Each component page has an "Open in Claude" style deep link that pre-fills a prompt with the page's Markdown.

**Project agent context (written by `ndop init`, refreshed by `add`/`update`)**

- `AGENTS.md` section (or `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md` depending on `--agent`): import paths, installed components and their versions, token names, the rule to prefer existing components over new markup, and the `ndop verify` loop.
- A Claude Code skill folder (`.claude/skills/ndop/SKILL.md`) with the same guidance plus when to call the MCP server.
- Content is between `<!-- ndop:start -->` / `<!-- ndop:end -->` markers so the CLI only rewrites its own section.

**The verify loop**

`ndop verify` gives agents a closed loop: generate code, verify, read structured errors, fix. It runs the type-checker, `validate_usage`, ESLint with the Ndop plugin, axe on a rendered harness, and a Playwright screenshot saved to `.ndop/verify/` that a multimodal agent can inspect. Output is JSON with file, line, rule and suggested fix.

**ESLint plugin (`@ndop/eslint-plugin`)**

Rules for template and TS: missing accessible name on icon buttons, dialog without title, form control without label, physical (non-logical) direction utilities in registry code, raw palette colors instead of tokens, importing primitives' private paths.

## Documentation site

The docs site is the product's storefront and must be visibly better than shadcn/ui, Radix and Angular Material docs on three axes: you can _do_ things on every page, everything shown is tested, and it feels fast and crafted.

### Stack

- Analog (Angular meta-framework) with static prerendering of every route and hydration, so the docs dogfood Angular, SSR and the components themselves.
- Content in Markdown/MDX-style files with Angular component embeds; component pages are assembled from `metadata.json` plus a short hand-written intro.
- Search: Algolia DocSearch (decided). Must index headings, props and keyboard shortcuts.
- Syntax highlighting with Shiki at build time (no client-side highlighter).
- Hosted as static files on any CDN; previews per PR.

### Information architecture

| Section     | Contents                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Get started | Introduction, Installation (Angular CLI, Nx, Analog), Theming, Dark mode, CLI, `ndop.json`, Agents & MCP, Migrating from Angular Material, Migrating from spartan/shadcn |
| Components  | One page per component, grouped: Inputs, Overlays, Navigation, Data display, Feedback, Layout                                                                            |
| Blocks      | Visual gallery of full sections and pages (auth, dashboards, settings, marketing, data tables, sidebars), filterable by category                                         |
| Themes      | Theme studio and a gallery of community themes                                                                                                                           |
| Patterns    | Forms with Signal Forms, data fetching with `resource()`, responsive layouts, i18n and RTL, building your own registry                                                   |
| Primitives  | Headless API reference for people building their own design system                                                                                                       |
| Changelog   | Per-item versions with diffs and "what `ndop update` will do" notes                                                                                                      |

### Component page anatomy (in this order)

1. **Header:** name, one-sentence description, badges (version, primitive pattern, SSR, zoneless, bundle size in gzip), and action buttons: Copy install command, Copy page for agent, Open in StackBlitz, View source, Report issue.
2. **Hero preview:** the main example rendered live in a resizable frame with Preview / Code tabs, a light/dark toggle, an RTL toggle and a viewport width switcher (mobile, tablet, desktop). The frame is isolated so docs styles never leak in.
3. **Install:** CLI tab (`npx ndop add dialog`) and Manual tab (files to copy, deps to install), both with one-click copy.
4. **Usage:** the smallest correct import and template.
5. **Playground:** controls generated from metadata (enum → segmented control, boolean → switch, string → input, number → slider). Changing a control updates the live preview and the code snippet together; the snippet is always copy-pasteable.
6. **Examples:** every example is a real file in the registry, compiled and tested in CI; each has preview, code, a short "when to use this" line and its own deep link.
7. **Accessibility:** WAI-ARIA pattern link, a keyboard table rendered from `spec.md` with keycaps, and focus behavior notes. An interactive "try the keyboard" mode highlights each key as the user presses it.
8. **API reference:** one table per part with inputs, models, outputs, data attributes and CSS variables, generated from metadata, with types linked.
9. **Agent notes:** do/don't pairs and the minimal correct snippet, mirrored to the `.md` twin and MCP.
10. **Footer:** previous/next, "Edit this page", last updated, version history.

### Look and feel (design spec)

- **Layout:** three columns on desktop: left nav (260 px), content (max 760 px prose, previews may break out to 1,040 px), right "On this page" rail with scroll-spy. Collapses to a single column with a bottom-sheet nav on mobile.
- **Typography:** a variable sans (Inter or Geist) for UI and body at 16 px / 1.65, a mono (Geist Mono or JetBrains Mono) for code at 14 px. Headings tight (-0.02em tracking). Fluid type scale with `clamp()`.
- **Color:** neutral, near-monochrome UI so components are the color. Uses the same Ndop tokens as the components, so switching the docs theme in the theme studio restyles the entire site live.
- **Surfaces:** 1 px hairline borders, large radii on preview frames (12 px), a subtle dotted or grid background inside previews, no heavy shadows or gradients.
- **Motion:** 150–250 ms ease-out for UI; View Transitions API for route changes and theme switches; everything respects `prefers-reduced-motion`.
- **Code blocks:** file name tab, language label, copy button, line highlighting, word highlighting, diff mode (`+`/`-` lines) and collapse for long files with "show all".
- **Craft details:** keycap component for shortcuts, inline "copied" toast, anchor links on every heading, smooth scroll offset for sticky header, crisp favicon and OG images generated per page (component name + live render snapshot).

### DX features that set it apart

- **Command palette (⌘K / Ctrl+K):** searches docs, components, props and blocks; actions like "Copy install for Dialog", "Toggle dark", "Open theme studio", "Copy page for agent".
- **Theme studio:** edit tokens (colors in OKLCH with contrast warnings, radius, fonts, density) with the whole site and a sample dashboard updating live; export as CSS, as a `registry:theme` URL for `ndop init --theme`, or as JSON tokens.
- **Blocks gallery:** large live previews with device frames, filter by category, "Copy CLI command", "Open in StackBlitz", and a dependency list.
- **Version switcher** for the two supported Angular majors and Ndop versions, plus a per-component changelog that shows the diff between versions.
- **"Update preview":** on the changelog, paste your local file and see what `ndop update` would produce (the merge runs in the browser).
- **Shareable state:** playground settings serialize into the URL so any configuration can be linked.
- **Feedback widget** on every page ("Was this helpful?" + optional comment) to a GitHub discussion or form.

### Docs quality bar (MUST)

- Lighthouse ≥ 95 in all four categories on every page; LCP < 1.5 s, CLS < 0.05, INP < 200 ms on a mid-range mobile profile.
- Zero axe violations site-wide; full keyboard navigation; visible focus everywhere.
- No example code on the site that isn't compiled and tested in CI.
- Every page works without JavaScript for reading (prerendered); interactivity hydrates progressively.

## Quality engineering and CI

Every component, example, block and CLI command is tested the way users will actually use it: installed into a fresh Angular app.

| Layer             | Tooling                                                                            | What it checks                                                      |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Unit              | Vitest (Angular's Vitest builder) + Angular Testing Library                        | State, inputs/models, controlled vs uncontrolled, forms integration |
| Accessibility     | axe-core + scripted keyboard tests generated from `spec.md`                        | Roles, names, keyboard map, focus return, focus trap                |
| Visual regression | Playwright screenshots of every example in light, dark and RTL                     | Unintended visual changes; diffs attached to PRs                    |
| SSR / hydration   | Analog test app rendering each example server-side                                 | No hydration mismatch warnings, no DOM access during SSR            |
| Zoneless          | Test harness app with `provideZonelessChangeDetection()`                           | Updates render without Zone.js                                      |
| Registry e2e      | Script: `ng new` → `ndop init` → `ndop add <every item>` → `ng build`              | Every item installs and compiles with default config                |
| Update e2e        | Fixture repos with realistic local edits, then `ndop update`                       | Clean-merge rate, conflict markers correct, lockfile correct        |
| CLI               | Vitest with a virtual file system, plus snapshot tests of written files            | Idempotency, dry-run accuracy, AST edits                            |
| Agent eval        | 50 scripted prompts run against the MCP server; outputs checked with `ndop verify` | Agent accuracy metric                                               |
| Bundle size       | size-limit per primitive and styled item                                           | Budgets from Success metrics                                        |
| Docs              | Lighthouse CI, link checker, axe on every route                                    | Docs quality bar                                                    |

**CI matrix:** Angular current major and the one before; Node LTS versions; npm, pnpm and bun for the registry e2e; zone and zoneless.

**Release:** Changesets for npm packages; registry items versioned independently and published as immutable snapshots; each release generates the changelog page and "what changed" diffs.

**Governance artifacts:** public RFCs in `rfcs/`, ADRs in `docs/adr/`, CONTRIBUTING with the per-component definition of done, issue templates for bugs, a11y issues and component requests.

## Monorepo structure and tech stack

One Nx monorepo with pnpm workspaces holds every package, the registry source and the docs, so a change to a primitive, its styled item, its metadata and its docs page lands in one PR.

```text
ndop/
├─ apps/                    # deployed: never published to npm
│  ├─ docs/                 # Analog docs site, playground, theme studio
│  └─ harness/              # Test app: SSR + zoneless + every example routed
├─ packages/                # published to npm under the @ndop scope
│  ├─ primitives/           # @ndop/primitives (one folder per primitive + spec.md)
│  ├─ core/                 # @ndop/core: cn, variants, provideNdop, icons adapter
│  ├─ cli/                  # @ndop/cli: the ndop CLI + ng-add schematic
│  ├─ mcp/                  # @ndop/mcp server
│  ├─ metadata/             # @ndop/metadata: API extractor
│  ├─ eslint-plugin/        # @ndop/eslint-plugin
│  └─ schema/               # @ndop/schema: registry, item, config, lockfile, metadata JSON schemas
├─ registry/                # source of copy-in items, served at ndop.dev/r
│  ├─ ui/                   # styled items (button/, dialog/, ...)
│  ├─ examples/             # one file per example, referenced by items
│  ├─ blocks/               # page-level compositions
│  ├─ themes/               # registry:theme items
│  └─ registry.json         # source manifest
├─ tools/                   # internal tooling: private, never published
│  ├─ workspace-plugin/     # Nx generators + executors for this repo
│  ├─ registry-e2e/         # ng new → ndop init → ndop add → ng build suite
│  ├─ update-fixtures/      # fixture repos with local edits for ndop update tests
│  └─ agent-evals/          # 50-prompt eval suite and runner
├─ docs/adr/                # architecture decision records
└─ rfcs/                    # this RFC and later ones
```

**Placement and naming rules (MUST)**

- `packages/` = published to npm, `apps/` = deployed, `tools/` = internal and never published. Decide which one a new project is before generating it.
- Folder and Nx project names are unprefixed (`packages/core`, project `core`). The `ndop` name lives only in the npm scope: `@ndop/core`.
- Projects under `tools/` use the scope too, for clean imports, and set `"private": true` in their `package.json` (e.g. `@ndop/workspace-plugin`).
- Logic belongs in the workspace plugin; `registry-e2e`, `update-fixtures` and `agent-evals` hold test projects and data that its executors run against.

| Concern   | Choice                                                                      |
| --------- | --------------------------------------------------------------------------- |
| Language  | TypeScript strict, `noUncheckedIndexedAccess` on                            |
| Framework | Angular 21+ standalone, signals, zoneless                                   |
| Behavior  | `@angular/aria`, `@angular/cdk`                                             |
| Styling   | Tailwind CSS v4, CSS variables, OKLCH colors                                |
| Utilities | clsx, tailwind-merge                                                        |
| Icons     | `@lucide/angular` by default via an adapter (swappable, ADR-0013)           |
| Docs      | Analog, Shiki, Algolia DocSearch                                            |
| Monorepo  | Nx + pnpm                                                                   |
| CLI       | Node LTS, commander or citty, ts-morph, prompts, node-diff3 (or equivalent) |
| MCP       | Official MCP TypeScript SDK, stdio and HTTP transports                      |
| Testing   | Vitest, Angular Testing Library, Playwright, axe-core                       |
| Release   | Changesets, GitHub Actions                                                  |

The folder tree is logical: actual project locations follow Nx's conventions for the workspace preset (see Nx-first workflow). Library versions above are intent, not pins: the implementing agent MUST check current releases and record exact versions in the Phase 0 ADR.

## Implementation plan

Eight phases, each ending in something demonstrable; the riskiest piece (three-way merge) gets a spike in Phase 0 so the core promise is proven early. Week counts are indicative for one developer working with Claude Code.

### Phase 0 — Foundations and merge spike (week 1)

- [x] Nx + pnpm monorepo with the structure above, strict TS, ESLint, Prettier, Vitest, Playwright, Changesets, GitHub Actions, all set up through Nx generators; the tools/workspace-plugin project with its first local generator, primitive.
- [x] ADR-0001 (stack and exact versions), ADR-0002 (registry format as shadcn superset), ADR-0003 (merge strategy).
- [x] JSON schemas for registry item, `ndop.json`, lockfile and metadata in `packages/schema`.
- [x] Merge spike: a standalone script that three-way merges a sample `button.ts` across 10 fixture edits; record the clean-merge rate in ADR-0003.

* **Accept when:** CI is green on an empty-but-wired repo and the spike reports ≥ 8/10 clean merges.
* **Accepted 2026-10-02:** CI green; spike 9/10 clean with the strategy in ADR-0003 amendment 1.

### Phase 1 — Core and first primitives (weeks 2–3)

- [x] `@ndop/core`: `cn`, `variants` with full typing, `provideNdop` with theme mode handling, SSR-safe.
- [x] Token CSS (light, dark, density, motion) and the default theme.
- [x] Primitives with `spec.md` first, then code and tests: Button, Label, Input, Separator, Dialog, Popover, Tooltip.
- [x] Harness app routing every example, running in SSR and zoneless.

* **Accept when:** the seven primitives pass unit, axe, keyboard, SSR and zoneless tests.
* **Accepted 2026-10-02:** CI green on Node 22 and 24, Angular 21 and zone.js (run 37009540173).

### Phase 2 — Styled registry, `ndop build`, `init` and `add` (weeks 4–5)

- [x] Styled items and at least two examples each for the Phase 1 primitives.
- [x] `ndop build` producing static registry JSON and versioned snapshots.
- [x] `ndop init` and `ndop add` with AST edits, alias resolution, package-manager detection, lockfile writing, `--dry-run` and `--json`.
- [x] Registry e2e in CI.

* **Accept when:** `ng new` → `ndop init` → `ndop add dialog` → `ng build` passes on npm, pnpm and bun in under 2 minutes, and re-running `add` is a no-op.
* **Accepted 2026-10-03:** CI green on Node 22 and 24, Angular 21, zone.js and the registry install test, where npm, pnpm and bun on Angular 22 took 26–41 s and pnpm on Angular 21 took 63 s (run 37118019017).

### Phase 3 — Metadata and docs v1 (weeks 6–8)

- [x] Metadata extractor and schema; CI rule for missing descriptions and keyboard maps.
- [x] Analog docs with the full component page anatomy, code blocks, ⌘K palette, dark/RTL toggles and playground generated from metadata.
- [x] `llms.txt`, `llms-full.txt` and `.md` twins.

* **Accept when:** every Phase 1 component has a complete page generated from metadata, and Lighthouse ≥ 95 and zero axe violations hold on all routes.
* **Accepted 2026-10-05:** CI green (run 37257777361). ADR-0016 amendment 10 later lowered the Lighthouse performance floor to 90, with 90–94 a warning.

### Phase 4 — Agent tooling (weeks 9–10)

- [x] MCP server with all tools in the Agent-native DX table, stdio and HTTP.
- [x] Agent context files written by `init` and refreshed by `add`.
- [x] `ndop verify` and the ESLint plugin.
- [x] Agent eval suite (50 prompts) in `tools/`.

* **Accept when:** Claude Code, given only the MCP server and a fresh app, builds a settings page from a one-line prompt and `ndop verify` passes; eval accuracy ≥ 95%.
* **Accepted 2026-10-08:** CI green (run 37665162215); the eval scored 49/50 (98%) on `claude-sonnet-5`, settings page included, run by hand as ADR-0019 amendment 1 allows.

### Phase 5 — Diff and update (weeks 11–12)

- [ ] `ndop diff` and `ndop update` per the algorithm, including `--interactive`, migrations and codemods.
- [ ] Update e2e fixture suite; changelog pages with version diffs; in-browser "update preview".

* **Accept when:** ≥ 90% clean merges on the fixture suite, conflicts produce valid markers and non-zero exit, and the lockfile is correct after every run.

### Phase 6 — Catalog, blocks and theme studio (weeks 13–16)

- [ ] Remaining v1 catalog (see Component catalog).
- [ ] At least 12 blocks across auth, dashboard, settings, data table, sidebar and marketing.
- [ ] Theme studio with export to CSS, theme URL and JSON; community theme gallery.
- [ ] `ndop doctor`; namespaced and private registries; a "build your own registry" guide and template repo; shadcn-compat output via ndop build --compat shadcn, with an e2e that installs a compat item through the shadcn CLI.

* **Accept when:** an external sample registry installs via `ndop add @sample/widget`, and every block builds in the registry e2e.

### Phase 7 — Launch (weeks 17–18)

- [ ] Migration guides, landing page with live hero demo, OG images, Changelog.
- [ ] Launch write-up: "Updating code you own: three-way merges in a component registry."
- [ ] Third-party notices: a license notice served with the registry (shadcn/ui's MIT terms and any others), acknowledgements in the README, and a shadcn/ui credit on the docs site (ADR-0014, amendment 1). Registry files carry no notices of their own.
- [ ] Public roadmap and contribution guide; 1.0.0 release.

* **Accept when:** every success metric with a CI measurement is met and the launch checklist is complete.

## Component catalog and definition of done

The v1 catalog covers what a real SaaS app needs; nothing ships until it meets the full definition of done below.

| Group        | Components                                                                                                                            | Phase                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Inputs       | Button, Input, Label, Textarea, Checkbox, Radio Group, Switch, Select, Combobox, Slider, Toggle, Toggle Group, Input OTP, Date Picker | 1 (first four), 6 (rest)        |
| Overlays     | Dialog, Alert Dialog, Sheet, Drawer, Popover, Tooltip, Hover Card, Dropdown Menu, Context Menu                                        | 1 (Dialog, Popover, Tooltip), 6 |
| Navigation   | Tabs, Breadcrumb, Pagination, Navigation Menu, Menubar, Sidebar, Command                                                              | 6                               |
| Data display | Card, Badge, Avatar, Table, Data Table, Accordion, Collapsible, Calendar, Chart wrappers                                              | 6                               |
| Feedback     | Alert, Toast (Sonner-style), Progress, Skeleton, Spinner, Empty State                                                                 | 6                               |
| Layout       | Separator, Aspect Ratio, Scroll Area, Resizable, Form Field                                                                           | 1 (Separator), 6                |

**Definition of done (every component)**

- [ ] `spec.md` with ARIA pattern, roles, keyboard map, focus rules, RTL notes
- [ ] Primitive with signals API, controlled and uncontrolled modes, forms integration where it bears a value
- [ ] Styled item using tokens only, logical properties only, `class` input merged last
- [ ] At least two examples, including one realistic one (e.g. dialog with a form)
- [ ] Unit, axe, keyboard, SSR, zoneless and visual tests passing in light, dark and RTL
- [ ] Metadata complete (every public input described), docs page generated, `.md` twin present
- [ ] Within its bundle-size budget
- [ ] Installs and builds in the registry e2e; covered in the agent eval suite

## Risks, open questions and ADR index

The biggest risk is the update promise: if merges conflict often, Ndop's main differentiator becomes its main complaint, which is why it is spiked in Phase 0 and measured in CI.

| Risk                                            | Mitigation                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge conflicts too frequent                    | Keep files small and structured; structural merge for `variants()` and host bindings; codemods for breaking changes; publish the clean-merge rate |
| `@angular/aria` gaps or API churn               | Wrap it behind Ndop primitives so churn is absorbed in one package; ADR for each custom fallback                                                  |
| Angular major upgrades                          | Support only two majors; run the matrix in CI; ship `ndop update` codemods per major                                                              |
| Scope creep in the catalog                      | Definition of done gates every item; ship fewer, finished components                                                                              |
| Docs performance regressions from live previews | Lazy-hydrate previews on visibility; Lighthouse CI budget fails the PR                                                                            |
| Agent output quality                            | Eval suite in CI; metadata completeness rule; `verify` loop documented in agent context                                                           |

**Decisions (resolved)**

| Question             | Decision                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| Name                 | Ndop UI at ndop.dev: npm scope `@ndop`, CLI `ndop`, selector prefix `nd` |
| Docs search          | Algolia DocSearch                                                        |
| Styled API           | Directive-only                                                           |
| Icons                | Icon-agnostic API, `@lucide/angular` by default (ADR-0013)               |
| shadcn compatibility | Yes: compat registry output alongside the native format                  |

**Before Phase 0 (owner: Valery)**

- [ ] Register `ndop.dev` and the `@ndop` npm org, and create the repo at `github.com/valerymelou/ndop`.

**Expected ADRs**

| ADR  | Title                                                     | Phase |
| ---- | --------------------------------------------------------- | ----- |
| 0001 | Stack and pinned versions                                 | 0     |
| 0002 | Registry format as a shadcn superset                      | 0     |
| 0003 | Three-way merge strategy and structural merge scope       | 0     |
| 0004 | Primitives on `@angular/aria` + CDK, and custom fallbacks | 1     |
| 0005 | Directive-only styled API                                 | 1     |
| 0006 | Token naming compatible with shadcn                       | 1     |
| 0007 | Metadata extraction approach                              | 3     |
| 0008 | Docs search on Algolia DocSearch                          | 3     |
| 0009 | MCP tool surface and transports                           | 4     |
| 0010 | Lockfile format and update safety rules                   | 5     |
