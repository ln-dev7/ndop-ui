# ADR-0018: `ndop verify` and the ESLint plugin

- Status: Accepted (approved by Valery on 2026-10-05), with amendment 1
- Date: 2026-10-05
- Phase: 4
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Agent-native DX" (the
  verify loop, ESLint plugin, `validate_usage`), "CLI" (`ndop verify`),
  Phase 4; ADR-0007, ADR-0009, ADR-0011

## Context

`ndop verify [paths...]` gives agents a closed loop. RFC-0001 has it run
the type-checker, `validate_usage`, ESLint with the Ndop plugin, axe on a
rendered harness, and a Playwright screenshot saved to `.ndop/verify/`,
and print JSON with file, line, rule and suggested fix. The success metric
"agent accuracy" is the share of generated snippets that pass it.

`validate_usage` checks a template against metadata: unknown inputs,
missing required parts, wrong nesting and missing labels. The metadata
(ADR-0007) has each part's selector, inputs, models and outputs with
`required`, but nothing about which part must sit inside which.

The ESLint plugin has six rules: missing accessible name on icon buttons,
dialog without title, form control without label, physical direction
utilities in registry code, raw palette colors instead of tokens, and
imports of primitives' private paths. `@ndop/eslint-plugin` is an empty
stub; the workspace has ESLint 9.39.5, `@angular-eslint/template-parser`
and `@angular-eslint/utils` 22.5.0.

Rendering a user's component needs their app's build: their providers,
styles and aliases. `@angular/build` 22.2.1 exports `buildApplication`, an
Architect builder, so it runs inside an Architect context.

## Decision

### Where the code lives

- A new package, `@ndop/verify` (ESM, `type:tooling`), holds
  `validate_usage`, the ESLint run, the harness build and the browser
  checks. Its dependencies are ESLint, `@angular-eslint/template-parser`,
  `@ndop/eslint-plugin`, `playwright-core` and `axe-core`. Putting them in
  the CLI would make every `npx ndop` install pull in a linter and a
  browser driver. RFC-0001's layout doesn't list this package, so it's a
  deviation, approved by Valery on 2026-10-05.
- `ndop verify` imports it on demand. If it isn't installed, verify exits
  with the exact command for the detected package manager
  (`pnpm add -D @ndop/verify`), and `init --agent` offers to add it.
  `@ndop/mcp` depends on it directly.
- It drives the project's own `@angular/build` and
  `@angular-devkit/architect`, resolved from the project, so the harness
  compiles with the user's Angular version and settings.

### The checks, in order

1. **`validate_usage`** parses each template (inline or `templateUrl`)
   with `@angular/compiler`'s template parser from the project, and, for
   every element or attribute matching an Ndop selector from installed
   items' metadata, reports:
   - an `nd`-prefixed selector, attribute or input no installed item
     declares, which is how hallucinated APIs show up, with the closest
     real name;
   - a required input that isn't bound;
   - a part outside the part it must sit in (see "Nesting" below);
   - a component used but not installed, with its `ndop add` command.
2. **Type-check and build:** a temporary entry under `.ndop/verify/`
   imports each given component, and the project's `build` target runs
   through Architect with overrides: that entry as `browser`, output in
   `.ndop/verify/dist`, no SSR, no prerender, development optimization.
   The application builder type-checks templates strictly, so this is the
   type-check; its diagnostics are mapped back to file and line.
3. **ESLint** runs through the ESLint Node API with the project's config
   if there is one, plus the Ndop plugin's `recommended` config on top.
4. **Render, axe and screenshot:** the built harness is served from
   memory, each component renders in Chromium (Playwright) at
   `/?c=<name>`, in light and dark, and axe runs on it. A screenshot of
   each goes to `.ndop/verify/<name>.<scheme>.png`. A component with
   required inputs is reported as skipped, not failed, since verify can't
   invent its data.

A failed step doesn't stop later ones, unless the build fails, which skips
rendering. `--skip <step>` skips any step; rendering also skips, with a
warning, when Chromium isn't installed, and the warning gives the install
command.

### Output

`--json` prints:

```ts
{
  ok: boolean;
  steps: { name: 'usage' | 'build' | 'lint' | 'render'; ok: boolean;
           skipped?: string; durationMs: number }[];
  problems: { file: string; line: number; column: number; rule: string;
              severity: 'error' | 'warning'; message: string;
              fix?: string }[];
  screenshots: string[];
}
```

The exit code is non-zero when any error remains. Rules are namespaced
(`usage/unknown-input`, `build/TS2322`, `ndop/dialog-title`,
`axe/button-name`), so an agent can act on them.

### Nesting in metadata

Nesting comes from dependency injection, not from hand-written rules. A
primitive part that requires another part injects it without
`optional: true` (`NdDialogTitle` injects `NdDialog`). The metadata
extractor records that as `parts[].requires`, the selectors of the parts
that must enclose it. This is amendment 2 to ADR-0007, and adds an
optional `requires` property to the metadata schema. Styled parts inherit
it through their host directives.

### ESLint plugin rules

Template rules use the Angular template parser; TypeScript rules use
`@typescript-eslint/utils`. Each rule has tests with ESLint's
`RuleTester`, and an autofix where the fix is unambiguous.

| Rule                    | Checks                                                                                                                            | Fix                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `icon-button-name`      | An `ndButton` whose only content is icons, with no `aria-label`, `aria-labelledby` or `sr-only` text                              | None                   |
| `dialog-title`          | An `ndDialogContent` with no `ndDialogTitle` inside it                                                                            | None                   |
| `form-control-label`    | An `ndInput` (and later controls) with no `ndLabel for`, enclosing label, `aria-label` or `aria-labelledby`                       | None                   |
| `logical-properties`    | Physical utilities (`ml-`, `pr-`, `left-`, `text-left`, `rounded-l-`...) in `class` attributes, bindings and `variants()` strings | The logical equivalent |
| `no-raw-colors`         | Palette utilities (`bg-red-500`) and arbitrary color values (`text-[#333]`)                                                       | None                   |
| `no-private-primitives` | Imports from `@ndop/primitives` paths outside its package exports                                                                 | None                   |

- `recommended` enables all six. `logical-properties` and `no-raw-colors`
  apply to the item folders from `ndop.json` (`aliases.ui` and
  `aliases.blocks`) and to the user's templates; the rest apply
  everywhere.
- The Ndop registry and docs examples lint with `recommended`, so the
  rules are dogfooded on every item.
- The selectors each rule matches come from the metadata at build time,
  not from hard-coded names, so new components are covered.

## Consequences

- An agent gets every problem in one JSON report, each pointing to a file,
  a line and a rule.
- A full verify needs a build and a browser, so it takes seconds, not
  milliseconds; `--skip render` is the fast loop.
- The Architect-driven harness is the riskiest part. It's spiked first;
  if the overrides don't work on the user's build target, the fallback is
  to generate a temporary build target in a copy of `angular.json` under
  `.ndop/verify/`. Either way the user's own files are never changed.
- `.ndop/` is added to `.gitignore` by `init`.

## Implementation notes (2026-10-05)

Details settled while building it, within the decision above:

- **The Architect spike worked**, so the fallback isn't needed. The harness
  builds through the app's `build` target with a workspace host that drops
  the SSR options (`server`, `ssr`, `prerender`, `outputMode`), since
  overrides can't remove them; the app's `angular.json` isn't touched.
- **Templates are parsed with angular-eslint's bundled Angular compiler**,
  the one the ESLint plugin uses, rather than the project's: usage checks
  read only the template's structure, which doesn't change between the
  supported majors.
- **`usage/unknown-input` only reports near misses** of a part's inputs
  (`varient` for `variant`). Other attributes may belong to other
  directives, such as `formControlName`, which verify can't see; real
  unknown bindings fail the build as `NG8002` anyway.
- **Lint** uses the project's ESLint config with Ndop's rules on top. If the
  project has no config, or its config can't load alongside them, Ndop's
  rules run alone, and the step says so.
- **No import cycle:** the CLI loads `@ndop/verify` on demand, so verify
  doesn't import the CLI. The CLI and the MCP server each pass it a
  metadata source built on their own registry access. The CLI resolves
  `@ndop/verify` from the project first, since `npx` and `pnpm dlx` run it
  from a cache folder.
- **`ndop init --verify`** adds `@ndop/verify` without a prompt, for
  scripts and the eval fixture; interactively, `init` asks when agents are
  set up.
- **Build warnings** are reported only for the checked files; the app's own
  warnings, such as its stylesheet's, aren't the checked code's problem.

## Amendment 1 (2026-10-14): every color comes from the theme's tokens

Status: Accepted by Valery on 2026-10-14, with the refinements below on
themes split across files and the project's ESLint setting.

**Why:** an agent building a dashboard wrote about 70 hex colors and its
own custom properties (`--ink`, `--lime`, `--coral`) in `src/app/app.css`,
which `src/styles.css` imports, and `ndop verify` passed. `no-raw-colors`
read class lists only, and verify linted `.ts` files only, so external
templates (`templateUrl`) and stylesheets were never checked. The same
run's screenshots showed an empty gap where a `log-out` icon belonged:
the component used `<svg ndIcon="log-out">` without importing `NdIcon`,
so the attribute did nothing, in the app as in the harness. Angular
reports nothing for a static attribute no directive matches.

The principle: every color comes from the theme's tokens. It covers every
place a color can be written, not a list of special cases.

### What counts as a raw color

- Hex colors; `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`,
  `lch()`, `oklab()`, `oklch()` and `color()` with literal arguments; and
  the CSS named colors in color properties (`color`, `background`,
  `border-*`, `fill`, `stroke`, shadows, gradients…) and custom
  properties. Elsewhere a bare word such as `red` may be an animation
  name, so it isn't one.
- Allowed: `var(--token)`, `color-mix()` over tokens, relative colors
  built from a `var()`, `transparent`, `currentColor`, `inherit`,
  `initial`, `unset`. A `var()` fallback that is a literal is reported.
- A custom property defined with a color (`--ink: #18332d`) is reported
  as a palette beside the theme's, whatever uses it, unless it's one of
  the theme's own definitions (below).

### Where it's checked

- **`ndop/no-raw-colors`** (ESLint, templates and TypeScript), as before
  for palette utilities and arbitrary values, now with any color literal
  in an arbitrary value (`bg-[#1e3170]`, `text-[rgb(…)]`,
  `shadow-[0_0_0_1px_red]`) and arbitrary properties (`[color:#fff]`,
  `[--ink:#18332d]`); plus `style` attributes, `[style.*]`, `[style]` and
  `[ngStyle]` bindings, and a component's inline `styles`. Its scope is
  unchanged: everywhere `recommended` applies, item folders included.
  Items are owned code that users edit, and the registry already lints
  clean with it.
- **Stylesheets**, in verify's lint step, under the same rule name: the
  checked components' `styleUrl`/`styleUrls`, the project's Tailwind
  stylesheet (`tailwind.css` in `ndop.json`), and every stylesheet either
  imports with a relative path (`@import`, `@use`, `@forward`). Package
  imports (`tailwindcss`, `@ndop/core/styles.css`) aren't app code and
  aren't read. `@apply` class lists get the class checks.
- **The theme's own definitions are allowed** only in the theme: the
  Tailwind stylesheet, where `ndop init` and theme items write them
  (ADR-0006, ADR-0023), and the stylesheets it imports by relative path,
  directly or through other imports, for a theme split into its own
  files. There, custom properties in the top-level `:root` and `.dark`
  rules, in `[data-ndop-theme='system']` under
  `@media (prefers-color-scheme: dark)`, and in `@theme` blocks are
  definitions. The rest of those files is checked like any stylesheet, so
  `@scope (app-root) { :scope { --ink: #18332d } }` in a file the
  Tailwind stylesheet imports is still a parallel palette, as is a color
  in an ordinary rule. To add a color, add it to the theme; anywhere else,
  including an `@theme` block in a file the Tailwind stylesheet doesn't
  import, it's a parallel palette. The Tailwind stylesheet's imports are
  read before components' stylesheets, so a theme file a component also
  imports is still the theme's.
- **The project's ESLint config sets the rule everywhere.** Verify lints
  with Ndop's `recommended` config before the project's config, not after,
  so the project's setting of an Ndop rule wins in templates and
  TypeScript. For stylesheets, verify asks ESLint
  (`ESLint#calculateConfigForFile`) for the setting the project's config
  gives each stylesheet path, with a base entry naming `**/*.css`,
  `**/*.scss`, `**/*.sass` and `**/*.less` so they count as linted files:
  `'off'` skips the file, `'warn'` reports warnings, which don't fail
  verify, and `'error'`, a config that doesn't set the rule, or no config
  at all reports errors. A stylesheet the config ignores (`ignores`) isn't
  checked. `ndop.configs.recommended` names only `.ts` and `.html` files,
  so stylesheets stay errors unless an entry without `files`, or one
  naming them, says otherwise.
- **External templates** (`templateUrl`) are now linted with the `.ts`
  files they belong to.

ESLint 9 doesn't parse CSS without a language plugin, and verify has no
CSS parser among its dependencies (PostCSS is the CLI's). The plugin gets
a small tokenizer, enough for blocks, statements, strings, parentheses
and comments (`//` too in Sass and Less), and exports
`stylesheetColors()`, `stylesheetImports()` and `themeColors()`, which
verify runs on stylesheet files. No new dependency.

**Fixes** name the token utilities (`bg-primary`,
`text-muted-foreground`, `border-border`) and `var(--primary)`, and in
verify, the project's color tokens: the custom properties holding colors
in the top-level `:root` of the Tailwind stylesheet and the stylesheets it
imports. The token list in the agent files (ADR-0017) still reads the
Tailwind stylesheet only.

### Icons in renders

Before axe and the screenshot, the render step waits up to two seconds
for every `svg[ndIcon]` to draw, so screenshots show the icons, then
reports each one still empty as `render/empty-icon`: without a `viewBox`,
`NdIcon` never ran, and the fix is to import it from `@ndop/core`; with
one, no icon of that name is registered in `{lib}/icons.ts`. The harness
itself needed no change: with `NdIcon` imported, the same app renders the
icon.

### Consequences

- A project with raw colors in its global stylesheets fails verify on any
  file, since the Tailwind stylesheet is always checked. That is the
  point: those colors reach every page. A project that can't fix them yet
  sets `ndop/no-raw-colors` to `'warn'` or `'off'` in its ESLint config,
  for every file or with `files`, and verify follows it.
- `--skip lint` skips the stylesheet check with the rest of the lint step.
  The JSON output is unchanged; stylesheet problems carry the rule
  `ndop/no-raw-colors` and a `file` ending in `.css` or `.scss`.
