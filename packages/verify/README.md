# @ndop/verify

The checks behind `ndop verify` and the MCP server's `verify` and
`validate_usage` tools (ADR-0018). It's a separate package so other `ndop`
commands don't install a linter and a browser driver.

## Install

```bash
npm install --save-dev @ndop/verify
npx playwright install chromium
```

`ndop init --verify` adds it for you. Without Chromium, everything but the
render step still runs.

## What it checks

1. **Usage:** templates against the components' metadata: `nd*` selectors
   no component has (with the closest name), components that aren't
   installed (with the `ndop add` command), misspelled inputs, values
   outside an input's allowed ones, required inputs left unbound, and parts
   outside the part they must sit in.
2. **Build:** a small harness rendering the checked components, built
   through the app's own `build` target, so the app's Angular version,
   styles, aliases and strict template checks apply. Type errors come back
   with their file and line.
3. **Lint:** `@ndop/eslint-plugin`'s rules on the files and their
   external templates, with the project's ESLint config when it has one;
   and `ndop/no-raw-colors` on stylesheets: the components' `styleUrl`s,
   the Tailwind stylesheet from `ndop.json`, and every stylesheet they
   import with a relative path. Every color must come from the theme's
   tokens, which are defined only in the Tailwind stylesheet and the
   stylesheets it imports, in their top-level `:root` and `.dark` rules,
   the `[data-ndop-theme='system']` rule under
   `@media (prefers-color-scheme: dark)`, and `@theme` blocks. The
   project's ESLint config decides how Ndop's rules report, stylesheets
   included: `'ndop/no-raw-colors': 'warn'` reports warnings, which don't
   fail verify, `'off'` skips the check, entries scoped with `files` apply
   to the files they name (`**/*.css` for stylesheets), and files the
   config ignores aren't checked.
4. **Render:** each component in Chromium, in light and dark, checked with
   axe, with icons that draw nothing and console errors reported, and a
   screenshot saved to `.ndop/verify/<Name>.<scheme>.png`. Components with required inputs are
   skipped: verify can't invent their data, so verify the page that uses
   them.

Only `.ndop/verify/` in the project is written to.
