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
3. **Lint:** `@ndop/eslint-plugin`'s rules, with the project's ESLint config
   when it has one.
4. **Render:** each component in Chromium, in light and dark, checked with
   axe, with console errors reported and a screenshot saved to
   `.ndop/verify/<Name>.<scheme>.png`. Components with required inputs are
   skipped: verify can't invent their data, so verify the page that uses
   them.

Only `.ndop/verify/` in the project is written to.
