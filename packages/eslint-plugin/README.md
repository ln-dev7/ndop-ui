# @ndop/eslint-plugin

ESLint rules for Angular apps that use Ndop UI: accessible names, labels,
dialog titles, theme tokens, logical direction utilities and the public
`@ndop/primitives` entry points. `ndop verify` runs them (ADR-0018), and the
Ndop registry lints with them.

## Use it

The template rules need angular-eslint's template parser, and its inline
template processor for components' `template`s, which angular-eslint's own
configs set up:

```js
// eslint.config.mjs
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

`recommended` turns every rule on: the template rules for `.html` files and
inline templates, the class and import rules for `.ts` files.

## Rules

### icon-button-name

A button, or a link styled as one, whose only content is icons has no
accessible name: screen readers announce it as just "button". Give it
`aria-label`, or text, which can be visually hidden:

```html
<button ndButton size="icon" aria-label="Close"><svg ndIcon="x"></svg></button> <button ndButton size="icon"><svg ndIcon="x"></svg><span class="sr-only">Close</span></button>
```

### dialog-title

Every dialog needs a title, which names it for screen readers. Put an
`ndDialogTitle` inside `ndDialogContent`, or give the content `aria-label`.

### form-control-label

Every form control needs a label: an `ndLabel` whose `for` is the control's
`id`, a label around it, or `aria-label`. A placeholder isn't a label.

### logical-properties

Physical direction utilities stay on one side in right-to-left layouts. The
rule fixes them to their logical equivalents: `ml-2` → `ms-2`, `pr-4` →
`pe-4`, `left-0` → `start-0`, `text-left` → `text-start`, `border-l` →
`border-s`, `rounded-tl-md` → `rounded-ss-md`. It checks `class` attributes
and bindings, and strings passed to `cn()` and `variants()` or set as a
`host` class. Centering with `left-1/2` or `left-[50%]` is allowed, since it
works the same in both directions.

### no-raw-colors

Every color comes from the theme's tokens. Palette colors (`bg-red-500`,
`text-zinc-900`), color literals (`#18332d`, `rgb()`, `oklch()`, named
colors such as `tomato`) and a palette of your own (`--ink: #18332d`)
bypass the theme, so they don't follow dark mode or a theme change. The
rule reads class lists, arbitrary values and properties (`text-[#333]`,
`[color:#fff]`), `style` attributes, `[style.*]`, `[style]` and
`[ngStyle]` bindings, and components' inline `styles`. Use tokens:
`bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive`,
or `var(--primary)` in CSS. `var()`, `color-mix()` over tokens,
`transparent` and `currentColor` are fine.

Theme tokens are defined in the theme only: the Tailwind stylesheet
(`tailwind.css` in `ndop.json`) or a stylesheet it imports by relative
path, in the top-level `:root` and `.dark` rules, the
`[data-ndop-theme='system']` rule under
`@media (prefers-color-scheme: dark)`, and `@theme` blocks. To add a
color, define it there and expose it to Tailwind:

```css
:root {
  --brand: #1e3170;
}

@theme inline {
  --color-brand: var(--brand);
}
```

`bg-brand` and `var(--brand)` then come from the theme. The same property
defined anywhere else, such as `@scope (app-root) { :scope { … } }`, is a
palette beside the theme's and is reported.

ESLint doesn't read stylesheet files, so the plugin also exports
`stylesheetColors(css, { theme })`, which `ndop verify` runs on
components' stylesheets, on the Tailwind stylesheet and on what they
import. With `theme: true`, which verify passes for the Tailwind
stylesheet and the stylesheets it imports, the theme's own blocks are
allowed. `themeColors(css)` lists a theme file's color tokens, for fixes.

To relax the rule for your project, set it in your ESLint config like any
rule; `ndop verify` follows the setting for templates, TypeScript and
stylesheets (`'warn'` doesn't fail verify, `'off'` skips the check, and
files your config ignores aren't checked):

```js
export default [...ndop.configs.recommended, { rules: { 'ndop/no-raw-colors': 'warn' } }, { files: ['src/app/legacy/**'], rules: { 'ndop/no-raw-colors': 'off' } }];
```

### no-private-primitives

Import `@ndop/primitives` only through its entry points, such as
`@ndop/primitives/dialog`. Other paths, like `@ndop/primitives/internal` or
files inside an entry point, can change in any release.

## How the rules know Ndop's components

Which parts are buttons, form controls and titled dialogs, and which
entry points are public, comes from the registry's component metadata. After
changing components, regenerate it:

```bash
pnpm nx run-many -t build -p registry primitives
pnpm nx g @ndop/workspace-plugin:eslint-catalog
```

The plugin's tests fail while the generated catalog is out of date.
