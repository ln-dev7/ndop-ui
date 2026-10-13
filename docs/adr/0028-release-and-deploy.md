# ADR-0028: The 1.0.0 release and the docs deployment

- Status: Accepted (approved by Valery on 2026-10-12)
- Date: 2026-10-12
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Quality engineering and
  CI" (release), "Documentation site" (hosting, previews per PR), Phase 7;
  ADR-0008, ADR-0009, ADR-0012, ADR-0016

## Context

Nothing is published yet: the ten packages are at 0.0.1, there is no
deploy workflow, and several docs features wait on both (Algolia
DocSearch, "Open in StackBlitz", the hosted MCP endpoint, the version
switcher). Registering the `ndop` npm name and the `@ndop` org, the
Cloudflare account and DocSearch's application are Valery's steps.

## Decision

### npm packages

- The ten public packages (`ndop`, `@ndop/cli`, `core`, `primitives`,
  `schema`, `metadata`, `merge`, `verify`, `mcp`, `eslint-plugin`) form one
  Changesets **fixed** group and release together as **1.0.0**.
- A `Release` workflow publishes from `master` when a Changesets version PR
  merges, with npm provenance through GitHub's OIDC trusted publishing, so
  no npm token is stored.
- The release job first runs the full CI, then the install test against
  the packages it is about to publish.

### Registry items

- Every registry item goes to **1.0.0** at launch, with a changelog
  section "Stable release; no code changes since <previous>." Its
  snapshot is the merge base for later updates, as for any version
  (ADR-0010). Later items keep their own semver (ADR-0012).

### Docs deployment

- A `Deploy` workflow builds the docs and runs `wrangler pages deploy`
  with the theme URL Function (ADR-0023). `master` deploys to `ndop.dev`;
  every PR gets a preview URL, posted on the PR, as the RFC asks.
- It checks the deployed site: trailing-slash redirects, `404.html`,
  `/r/index.json`, a theme URL, and the service worker (ADR-0027).
- The Cloudflare API token is a repository secret Valery adds.

### Features that wait on publishing

- **Algolia DocSearch** (ADR-0008): applied for once `ndop.dev` is live;
  the ⌘K palette keeps its local index as the fallback and adds
  DocSearch's results when its keys are configured.
- **"Open in StackBlitz"** on component and block pages: a form POST to
  StackBlitz's project API with a generated Angular app (`ng new`
  defaults, Tailwind, `ndop.json`) holding the item's files and the
  `@ndop/*` dependencies at the published version. No SDK dependency.
- **Hosted MCP at `ndop.dev/mcp`** (ADR-0009): **not in 1.0.** Pages serves
  static files and one Function; a remote MCP server needs its own
  deployment and an abuse budget. `npx -y @ndop/mcp` covers every agent
  at launch; this is on the public roadmap.
- **Version switcher** (ADR-0016, amendment 11): **deviation, deferred
  until a second major exists.** With one Ndop version and components
  identical on Angular 21 and 22, a switcher would list one entry. The
  per-item changelog already shows every version.

## Consequences

- Users install published, provenance-signed packages, and items from a
  stable 1.0.0 baseline.
- Every PR gets a reviewable docs preview.
- Two RFC items, the hosted MCP endpoint and the version switcher, move to
  the roadmap.
