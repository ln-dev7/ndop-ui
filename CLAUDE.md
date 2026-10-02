# Ndop UI

The source of truth is `rfcs/0001-ndop-ui.md`. Read "How to use this RFC" in full before any work, and re-read the RFC section for the area you are changing before you change it.

## Current phase

Phase 2 (Phase 0 and Phase 1 accepted on 2026-10-02). Do not start work from a later phase until I confirm this one is accepted.

## Hard rules

- Never run git commit, amend, tag, push or rebase. At the end of each unit of work, give me Conventional Commits messages, each with its exact `git add` command. No mention of Claude, Anthropic or AI, and no Co-Authored-By trailers.
- Document every export with TSDoc. Inline comments explain why, never what. No commented-out code, and no TODOs without an issue link.
- Never guess APIs for Angular, @angular/aria, CDK, Tailwind or Analog. Check the installed version's docs or source.
- Any deviation from the RFC needs an ADR in docs/adr/ and my approval first.
- A task is done only when lint, type-check and tests pass.
- Nx first: scaffold with `nx g` (check `--help`, run `--dry-run` first), put repeatable Ndop scaffolding and build steps in tools/workspace-plugin as generators and executors, run tasks through Nx, and follow Nx's repo layout conventions.

## Commands

Node from `.nvmrc`, pnpm from `packageManager` in package.json. Everything runs through Nx.

- Install: `pnpm install`
- All checks (as CI): `pnpm nx run-many -t lint typecheck test build e2e`
- Affected only: `pnpm nx affected -t lint typecheck test build e2e`
- Build / test / lint / typecheck one project: `pnpm nx <target> <project>`
- E2E (Playwright, docs): `pnpm nx e2e docs-e2e`
- Format: `pnpm nx format:check` / `pnpm nx format:write`
- Docs dev server: `pnpm nx serve docs`
- New primitive: `pnpm nx g @ndop/workspace-plugin:primitive <name> --pattern=<apg-slug> --dry-run`
- Merge spike report: `pnpm nx test merge-spike`
