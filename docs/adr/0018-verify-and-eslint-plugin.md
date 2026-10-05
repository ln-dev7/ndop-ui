# ADR-0018: `ndop verify` and the ESLint plugin

- Status: Accepted (approved by Valery on 2026-10-05)
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
