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
and serves `dist/registry` over HTTP. Then, for each case in
`project.json`:

1. `ng new --style=tailwind --zoneless --ssr=false` with that package
   manager;
2. `ndop init --yes`, `ndop add dialog --yes` and the app's `build` script,
   timed together against the 2-minute budget;
3. `ndop add dialog --yes --json` again, which must plan nothing and change
   no file;
4. for the case marked `update`: `ndop add button@0.1.0`, an edit to the
   Button file, `ndop update button`, which must merge the edit with
   upstream's changes, and the build again (ADR-0020).

Apps and one log per case end up in `tmp/registry-e2e`. bun must be on the
`PATH` for the bun case.
