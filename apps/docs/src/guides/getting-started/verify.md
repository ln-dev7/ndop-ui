---
title: Verify
description: ndop verify checks components and pages that use Ndop, for people and for agents, and says exactly what to fix.
order: 8
---

`ndop verify` checks the components and pages you or an agent wrote with
Ndop. It reports every problem with its file, line and rule, often with the
fix, and exits with an error until there are none.

```bash pm
npx ndop verify src/app/settings
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

Ndop's ESLint rules, with your project's own ESLint config when it has one.
See [the rules](#lint-rules).

### Render

Each component in Chromium, in light and dark: axe checks its
accessibility, console errors are reported, and a screenshot of each is
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
| `no-raw-colors`         | Colors come from the theme's tokens, not palette colors like `bg-red-500`.              |
| `no-private-primitives` | `@ndop/primitives` is imported only through its entry points.                           |
