# ADR-0022: Blocks and the blocks gallery

- Status: Accepted (approved by Valery on 2026-10-08)
- Date: 2026-10-08
- Phase: 6
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Registry spec"
  (`registry:block`), "Documentation site" (Blocks, blocks gallery),
  Phase 6; ADR-0002, ADR-0005, ADR-0015, ADR-0016

## Context

Phase 6 ships at least 12 blocks across auth, dashboard, settings, data
table, sidebar and marketing, and is accepted when every block builds in
the registry install test.

- The schema has `registry:block` but nothing uses it. Blocks have only the
  generic `categories` and `meta` fields.
- The RFC: blocks "may include routes, services and data adapters
  (`resource()`/`httpResource()` stubs) but MUST compile with mock data out
  of the box".
- The styled layer is directive-only (ADR-0005). Blocks are the canonical
  markup that composes those directives, so they are components.
- The install test installs one item (`dialog`) per case.
- ADR-0016, amendment 4, left device frames to the blocks gallery, and
  shadcn renders blocks, unlike components, in iframes.

## Decision

### Format

- A block is a `registry:block` item whose files go under
  `{blocks}/<name>/`: a standalone page component `<name>.ts` (template
  inline, or `<name>.html` when it's long), and when needed `data.ts` with
  the mock data behind a `resource()` the user swaps for `httpResource()`,
  plus small private components it needs.
- Names follow shadcn's: `login-01`, `dashboard-01`.
- `categories` is required for blocks, and its first entry is one of
  `auth`, `dashboard`, `settings`, `data-table`, `sidebar`, `marketing`.
  `ndop build` validates it.
- `registryDependencies` lists every styled item the block uses, so `ndop
add login-01` installs them.
- Blocks don't edit the user's routes. The item's `docs` field, which `add`
  prints, shows the route to add, for example
  `{ path: 'login', loadComponent: () => import('./blocks/login-01/login-01') }`.
- Blocks are versioned, changelogged and updated like any item.

### The first 12 blocks

| Category   | Blocks                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| auth       | `login-01` (card form), `login-02` (split screen with an image), `signup-01` (Signal Forms validation) |
| dashboard  | `dashboard-01` (stat cards, area chart, recent table), `dashboard-02` (tabs of analytics)              |
| settings   | `settings-01` (profile and account forms), `settings-02` (notification switches, danger zone)          |
| data-table | `data-table-01` (tasks: sort, filter, paginate, select, row actions)                                   |
| sidebar    | `sidebar-01` (app shell with grouped nav), `sidebar-02` (collapses to icons, sheet on mobile)          |
| marketing  | `hero-01` (headline, actions, product shot), `pricing-01` (plans with a monthly/yearly toggle)         |

Each uses only registry items and tokens, works in light, dark and RTL,
and has no axe violations.

### Generator

`nx g @ndop/workspace-plugin:block <name> --category=<category>` writes the
component, the `registry.json` entry at 0.1.0, the changelog, and the
harness route.

### Tests

- The harness routes `/blocks/<name>`. Its e2e runs axe and the visual
  test (ADR-0021) on every block at mobile and desktop widths.
- **The install test installs every block** in its pnpm cases on Angular
  22 and 21, after the timed `ndop add dialog`, and builds the app. The
  two-minute budget stays on the timed part only.
- The agent eval gains prompts that should lead to blocks (owner's run, as
  ADR-0019 amendment 1 says).

### Gallery

- `/blocks` lists every block, and `/blocks/<category>` filters them. Both
  are prerendered.
- Each block shows in an iframe of `/blocks/<name>/preview`, a prerendered
  page with only the block, marked `noindex`. The frame has a viewport
  switcher (mobile 375 px, tablet 768 px, desktop) and Preview / Code tabs.
  Iframes load lazily, so the gallery's Lighthouse score doesn't pay for
  them.
- Each block has "Copy CLI command" and its dependency list. "Open in
  StackBlitz" waits for Phase 7 with the component pages' (ADR-0016).
- `.md` twins and `llms.txt` list blocks; MCP's `list_blocks` and
  `get_block` already read them from the registry.

## Consequences

- Blocks are the first items with page components, routes in docs and
  mock data, so they are also the best agent examples.
- The install test gets slower by one build of every block per pnpm case,
  outside the budget.
- Twelve preview pages are added to the Lighthouse run.
