# @ndop/eslint-plugin

## 1.1.1

No changes in this release.

## 1.1.0

### Minor Changes

- ac2463e: Every color must come from the theme's tokens, wherever it's written.
  `ndop/no-raw-colors` now also reports color literals in `style`
  attributes, `[style.*]`, `[style]` and `[ngStyle]` bindings, components'
  inline `styles`, and Tailwind arbitrary properties such as
  `[color:#fff]`, and custom properties defined with a color
  (`--ink: #18332d`), which start a palette beside the theme's.

  `ndop verify` applies the rule to stylesheets as well: the checked
  components' `styleUrl`s, the Tailwind stylesheet from `ndop.json` outside
  the theme's own blocks, and every stylesheet they import. Its fixes list
  the project's color tokens. It now also lints external templates
  (`templateUrl`), and reports an `svg[ndIcon]` that draws nothing, either
  because the component doesn't import `NdIcon` or because the icon isn't
  registered, before taking the screenshot.

## 1.0.0

### Major Changes

- df8c4ef: First stable release. The nine packages release together from now on, at
  one version.
