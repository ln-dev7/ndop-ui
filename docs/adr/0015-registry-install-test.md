# ADR-0015: Registry install test

- Status: Accepted (approved by Valery on 2026-10-02)
- Date: 2026-10-02
- Phase: 2
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Quality engineering and
  CI", Phase 2 acceptance

## Context

Phase 2 is accepted when `ng new` → `ndop init` → `ndop add dialog` →
`ng build` passes on npm, pnpm and bun in under 2 minutes, and re-running
`add` is a no-op. The success metric times it "from `npx ndop init`". The
`@ndop/*` packages aren't published, and ndop.dev doesn't serve the registry
yet.

## Decision

- **Unpublished packages:** the test starts the workspace's existing
  Verdaccio local registry (`nx run @ndop/source:local-registry`), publishes
  freshly built `@ndop/*` packages to it, and points each package manager at
  it. Other packages proxy through to npmjs.
- **Unpublished registry:** it builds `dist/registry` and serves it on a
  local port; the CLI gets it through `NDOP_REGISTRY` (ADR-0012).
- **Scenario, per package manager:**
  `ng new --style tailwind --zoneless --ssr false` with that manager, then
  `ndop init --yes`, `ndop add dialog --yes`, `ng build`, then
  `ndop add dialog --yes --json` again, which must report an empty plan,
  with every file's hash unchanged.
- **Timing:** measured from `ndop init` to the end of `ng build`, against the
  2-minute budget; `ng new`'s own install is excluded, as the metric
  defines.
- **Matrix:** npm, pnpm and bun on Angular 22 (Phase 2 acceptance), plus
  pnpm on Angular 21, so the previous major is covered by a real install
  and not only by the source-level compat job.
- **Where:** the logic is a workspace-plugin executor, `registry-e2e`;
  `tools/registry-e2e` holds its project and config, as RFC-0001's layout
  says. It runs in its own CI job, which installs bun.

## Consequences

- The install path is tested exactly as users will run it, without
  publishing anything.
- The job takes several minutes; it runs on pull requests that affect the
  CLI, core, primitives, schema or registry, and on every push to master.
