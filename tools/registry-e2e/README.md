# registry-e2e

The registry install test (ADR-0015): it proves a user can go from a fresh
Angular app to a built app with an Ndop component, with each package
manager.

```bash
pnpm nx e2e registry-e2e
pnpm nx e2e registry-e2e --only=pnpm-ng22
```

It builds and versions every `@ndop/*` package with a unique
`0.0.0-e2e.<timestamp>` prerelease, publishes them to a local Verdaccio,
and serves `dist/registry` over HTTP. With `--packDir=<folder>`, the output
of `changeset pack`, it publishes those tarballs at their own version
instead: the Release workflow tests the exact packages it then publishes
(ADR-0028). Verdaccio serves `@ndop/*` only from what the test published,
never from npm. Then, for each case in `project.json`:

1. `ng new --style=tailwind --zoneless --ssr=false` with that package
   manager;
2. `ndop init --yes`, `ndop add dialog --yes` and the app's `build` script,
   timed together against the 2-minute budget. `ndop` runs as users run
   it: `npx --yes @ndop/cli`, `pnpm dlx @ndop/cli` or `bunx @ndop/cli`
   (ADR-0031);
3. checks that `init` added `@ndop/cli` to `devDependencies` at the
   prerelease under test (npm writes it with `^`), and that `npx ndop --version`, the app's own
   bin, prints it; then `npx ndop add dialog --yes --json` again, which
   must plan nothing and change no file;
4. `ndop list --json`, which must list Dialog as installed at its latest
   version, and `ndop view dialog`, which must succeed;
5. for the case marked `update`: `ndop add button@0.1.0`, an edit to the
   Button file, `ndop update button`, which must merge the edit with
   upstream's changes, and the build again (ADR-0020).

The case marked `shadcn` (`npm-ng22-shadcn`) installs without `ndop`
(ADR-0025): it serves `dist/registry/r/compat` with its URLs pointed at a
local server, runs `npx shadcn@4.21.4 add <local>/r/compat/dialog.json
--yes` in the new app with no `components.json`, checks that the item and
its dependencies were written and the setup note printed, applies the
note's steps (adds the theme and icons, imports the styles, registers
`provideNdop()` and `provideIcons()`), routes to a page using Dialog and
builds the app.

The case marked `registries` (`npm-ng22-registries`) is Phase 6's
acceptance test for third-party registries (ADR-0025): after `ndop init`
and the same `@ndop/cli` check, it copies `tools/registry-template`,
points its `@ndop/cli` at the published version, builds it with its own
`npm run build`, and serves it behind a bearer token. It adds
`"@sample": { "url": ".../{name}.json", "headers": { "Authorization": "Bearer ${SAMPLE_TOKEN}" } }`
to `ndop.json`, checks that `npx ndop add @sample/widget` without
`SAMPLE_TOKEN` fails naming it, then runs it with the token, which also
installs `button` from Ndop's registry, checks the lockfile, imports a page
using both and builds the app.

Apps and one log per case end up in `tmp/registry-e2e`. bun must be on the
`PATH` for the bun case.
