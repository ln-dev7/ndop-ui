---
title: Verify
description: ndop verify checks components and pages that use Ndop, for people and for agents, and says exactly what to fix.
order: 8
---

`ndop verify` checks the components and pages you or an agent wrote with
Ndop. It reports every problem with its file, line and rule, often with the
fix, and exits with an error until there are none.

```bash pm
npx @ndop/cli verify src/app/settings
```

Paths can be files or folders; `src/app` by default.

## Install

The checks need a linter and a browser driver, so they live in a separate
dev dependency, `@ndop/verify`, which `ndop init --verify` adds. The render
step also needs Chromium:

```bash pm
npm install --save-dev @ndop/verify
```

```bash pm
npx playwright install chromium
```

Without Chromium, every other step still runs, and the result says why
rendering was skipped.

## What it checks

:::steps

### Usage

Your templates, against the components' metadata: a selector no component
has, with the closest real one; a component that isn't installed, with its
`ndop add` command; a misspelled input; a value outside an input's allowed
ones; a required input left unbound; a part outside the part it must sit
in, such as a dialog title outside its dialog.

### Build

The checked components, built through your app's own `build` target, so
your Angular version, styles, path aliases and strict template checks
apply. Type and template errors come back with their file and line.

### Lint

Ndop's ESLint rules on the components and their template files, with your
project's own ESLint config when it has one, and the color rule on
stylesheets too. See [the rules](#lint-rules).

### Render

Each component in Chromium, in light and dark: axe checks its
accessibility, icons that draw nothing and console errors are reported,
and a screenshot of each is
saved to `.ndop/verify/`, which `init` adds to `.gitignore`. Components
with required inputs are skipped, since verify can't invent their data;
verify the page that uses them.

:::

Only `.ndop/verify/` is written to; your files and `angular.json` are never
changed.

## Options

| Option             | Effect                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| `--skip <steps>`   | Skip `usage`, `build`, `lint` or `render`; repeatable or comma-separated. |
| `--json`           | Prints one JSON result.                                                   |
| `--project <name>` | The Angular project, when `angular.json` has several.                     |
| `--cwd <path>`     | The project folder, by default the current one.                           |

`--skip render` is the quick loop while iterating; the full run takes a
few seconds per component.

## JSON output

With `--json`, verify prints one object an agent can act on:

```json
{
  "ok": false,
  "steps": [
    { "name": "usage", "ok": false, "durationMs": 5 },
    { "name": "build", "ok": true, "durationMs": 2292 },
    { "name": "lint", "ok": true, "durationMs": 21 },
    { "name": "render", "ok": true, "durationMs": 2000 }
  ],
  "problems": [
    {
      "file": "src/app/settings/settings.ts",
      "line": 12,
      "column": 9,
      "rule": "usage/wrong-nesting",
      "severity": "error",
      "message": "DialogTitle must be inside [ndDialog]."
    }
  ],
  "screenshots": [".ndop/verify/Settings.light.png", ".ndop/verify/Settings.dark.png"]
}
```

Rules are namespaced by step: `usage/…`, `build/TS2322` or `build/NG8002`,
`ndop/…` for the lint rules, and `axe/…` for accessibility.

## Lint rules

`@ndop/eslint-plugin` holds the rules verify runs. You can also add them to
your own ESLint config, alongside angular-eslint's:

```js title="eslint.config.mjs"
import angular from 'angular-eslint';
import ndop from '@ndop/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
  ...ndop.configs.recommended,
);
```

| Rule                    | Checks                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `icon-button-name`      | A button whose only content is an icon has `aria-label` or visually hidden text.        |
| `dialog-title`          | Every dialog has a title.                                                               |
| `form-control-label`    | Every form control has a label.                                                         |
| `logical-properties`    | Direction utilities are logical (`ms-2`, not `ml-2`), so layouts mirror; it fixes them. |
| `no-raw-colors`         | Every color comes from the theme's tokens. See [Colors](#colors).                       |
| `no-private-primitives` | `@ndop/primitives` is imported only through its entry points.                           |

## Colors

Every color comes from the theme's tokens, so it follows dark mode and a
theme change. `no-raw-colors` reports a color written any other way,
wherever it's written:

- palette utilities, such as `bg-zinc-900`, and color literals in
  arbitrary values and properties, such as `bg-[#1e3170]`,
  `text-[rgb(0_0_0)]` or `[color:#fff]`;
- hex colors, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()`,
  `oklch()`, `color()` and named colors such as `tomato`, in `style`
  attributes, `[style.color]`, `[style]` and `[ngStyle]` bindings, and
  components' `styles`;
- custom properties defined with a color, such as `--ink: #18332d`: a
  palette beside the theme's.

ESLint doesn't read stylesheet files, so verify checks them itself: the
components' `styleUrl`s, your Tailwind stylesheet (`tailwind.css` in
`ndop.json`), and every stylesheet they import with a relative path.

```css title="src/app/app.css"
/* Reported: a palette of its own, and a literal. */
:host {
  --ink: #18332d;
  color: #fff;
}

/* Fine: the theme's tokens. */
:host {
  color: var(--foreground);
  background: color-mix(in oklch, var(--primary) 10%, transparent);
}
```

Use the token utilities, such as `bg-primary`, `text-muted-foreground` and
`border-border`, in templates, and `var(--primary)` in CSS. `var()`,
`color-mix()` over tokens, `transparent` and `currentColor` are fine. Each
problem's fix lists your theme's color tokens.

### Adding a color to the theme

A color token is defined in the theme, and only there: in your Tailwind
stylesheet, or in a stylesheet it imports with a relative path, inside the
top-level `:root` and `.dark` rules, the
`[data-ndop-theme='system']` rule under
`@media (prefers-color-scheme: dark)`, and `@theme` blocks. A hex value is
fine there. Define the color in `:root` and `.dark`, then expose it in
`@theme inline` so Tailwind generates its utilities:

```css title="src/styles.css"
@import 'tailwindcss';
@import '@ndop/core/styles.css';

:root {
  --brand: #1e3170;
}

.dark {
  --brand: #8ea2e8;
}

@theme inline {
  --color-brand: var(--brand);
}
```

`bg-brand`, `text-brand` and `border-brand` now work in templates, and
`var(--brand)` in CSS. Each verify fix lists `brand` with the other
tokens.

The theme can live in a file of its own, imported from the Tailwind
stylesheet:

```css title="src/styles.css"
@import 'tailwindcss';
@import '@ndop/core/styles.css';
@import './theme.css';
```

```css title="src/theme.css"
:root {
  --brand: #1e3170;
}

.dark {
  --brand: #8ea2e8;
}

@theme inline {
  --color-brand: var(--brand);
}
```

Imports of imports count too. The rest of those files is checked like any
stylesheet: a color written in an ordinary rule is reported, and so is a
custom property defined with a color anywhere else, such as in
`@scope (app-root) { :scope { … } }` or a component's stylesheet. A file
the Tailwind stylesheet doesn't import isn't part of the theme, even if a
component imports it.

### Relaxing the rule

`no-raw-colors` reports errors, which fail verify. Your ESLint config can
change that for your project, as for any rule: `'warn'` reports the colors
without failing verify, and `'off'` turns the check off.

```js title="eslint.config.mjs"
import ndop from '@ndop/eslint-plugin';

export default [
  ...ndop.configs.recommended,
  {
    rules: { 'ndop/no-raw-colors': 'warn' },
  },
];
```

To relax it for some files only, scope the entry with `files`, and leave
files out of linting with `ignores`:

```js title="eslint.config.mjs"
import ndop from '@ndop/eslint-plugin';

export default [
  ...ndop.configs.recommended,
  {
    files: ['src/app/legacy/**/*.ts', 'src/app/legacy/**/*.html', 'src/app/legacy/**/*.css'],
    rules: { 'ndop/no-raw-colors': 'off' },
  },
  {
    ignores: ['src/vendor/**'],
  },
];
```

Verify follows your config's setting for templates, TypeScript and
stylesheets alike. For a stylesheet, it reads the setting the config gives
that file: an entry without `files` applies to every file, and an entry
with `files` applies when one of its patterns names the stylesheet, such as
`**/*.css` or `**/*.scss`. `ndop.configs.recommended` itself names only
`.ts` and `.html` files, so stylesheets stay errors until your config says
otherwise. Without an ESLint config, every color problem is an error.
