# ADR-0008: Docs search on Algolia DocSearch

- Status: Accepted (approved by Valery on 2026-10-03); DocSearch itself
  waits for ndop.dev to be public
- Date: 2026-10-03
- Phase: 3
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Documentation site",
  "DX features" (command palette), decisions table ("Docs search: Algolia
  DocSearch")

## Context

RFC-0001 decides on Algolia DocSearch, indexing headings, props and
keyboard shortcuts, and asks Phase 3 for a ⌘K command palette that searches
docs, components, props and blocks and runs actions ("Copy install for
Dialog", "Toggle dark", "Copy page for agent").

DocSearch crawls a public site and is granted per site through Algolia's
program, so it can't work before ndop.dev is registered, deployed and
accepted. Its UI (`@docsearch/js` 5.1.1) is a search modal; it doesn't run
actions.

## Decision

- **The palette is Ndop's own:** a dialog built on the registry's Dialog
  item and the CDK's `ActiveDescendantKeyManager` (WAI-ARIA combobox with a
  listbox), opened with ⌘K / Ctrl+K. Results are grouped: pages,
  components, props, keyboard shortcuts, actions.
- **Phase 3 results come from a local index** generated at build time from
  the metadata and the docs pages (titles, headings, props, keyboard maps),
  a small JSON file loaded the first time the palette opens. It works
  offline, in previews and before launch.
- **DocSearch is added as a source when it's available:** once ndop.dev is
  public and accepted, the palette queries DocSearch for full-text results
  through Algolia's search client, configured by build-time environment
  variables, and keeps the local index for actions and props. No change to
  the palette's UI.
- **Deviation:** Phase 3 ships without DocSearch, because DocSearch can't
  index a site that isn't public. The RFC's decision stands and is
  completed when the site is.

## Consequences

- The palette works from day one and can run actions, which DocSearch's
  own modal can't.
- Full-text search across guide prose arrives with DocSearch; until then,
  search covers titles, headings, components, props and shortcuts.
- Valery applies to DocSearch after ndop.dev is live.
