# ADR-0026: Brand, landing page and OG images

- Status: Proposed
- Date: 2026-10-12
- Phase: 7
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Documentation site" (look
  and feel, landing page, OG images), Phase 7; ADR-0016, ADR-0023

## Context

Phase 7 ships the landing page with a live hero demo and generated OG
images. Valery provided the logo: a vertical leaf with four stacked
diamonds cut out of it, after ndop cloth's motifs, as a mark and as an app
tile, in black, white and indigo (`#1E3170`), in SVG and PNG.

The RFC asks for a near-monochrome site "so components are the color", and
"a subtle dotted or grid background inside previews". The dotted backdrop
competes with the components it frames.

## Decision

### Brand

- The logo files live in `apps/docs/public/brand/` (SVG masters; PNGs
  generated from them at build time where a size is needed).
- The header shows the mark beside the "Ndop UI" wordmark; the footer
  shows the mark.
- **Indigo is a brand accent only:** the logo, the landing pattern, OG
  images, the PWA theme color and app icons. The docs chrome stays
  neutral, and components keep rendering in the default theme.

### Pattern

Two motifs drawn from the mark's own shapes, as inline SVG:

- **The hero mark:** the leaf, large and cropped at the hero's edge.
- **Diamond bands:** the mark's diamond chain laid horizontally, like
  strips of ndop cloth. Behind the hero they are faint and fade out with a
  mask; a single band divides the landing page's sections and frames the
  closing call to action.

Both use theme tokens for neutral tints and the indigo accent, so they
work in light, dark and RTL, and are `aria-hidden`.

### Previews

**Deviation:** component, example and block previews drop the dotted
backdrop for a plain surface with a hairline border, as shadcn's do.
RFC-0001's look-and-feel line is updated to match.

### Landing page

In order:

1. **Hero:** the mark, the headline ("Own your components. Update them
   anyway."), the one-line pitch, `npx ndop init` with copy, "Get
   started" and "Browse components", and the **live hero demo**: a small
   composition of real Ndop components (a card with a form, tabs and a
   chart) beside a theme picker of the gallery's themes; picking one
   restyles the demo in place.
2. **"Edit it. Update it anyway.":** a three-way merge shown as a short
   animated diff: a local edit, the upstream fix, the merged file.
3. **Built for agents:** MCP, `llms.txt` and `ndop verify`, with a short,
   real agent transcript.
4. **Accessible by contract:** the "try the keyboard" table from a
   component page, live.
5. **Blocks:** a strip of block thumbnails linking to the gallery.
6. **Proof:** components, blocks and themes counts, 0 axe violations,
   Button's size, Angular 21 and 22, all read from the built registry and
   size report at build time.
7. **Closing call to action** on a diamond band.

Only the hero demo hydrates on load; the other sections hydrate on view.
Motion respects `prefers-reduced-motion`.

### OG images

Generated at build time per page, 1200×630: the leaf lattice of the mark
(the busier motif, which has room here) on indigo, the page title, its
section, and for component pages a render of the main example, taken by
the build from the prerendered page. Pages without one get the title
alone.

## Consequences

- The site gains a recognizable identity without tinting the components
  it documents.
- The landing page is the heaviest page; its Lighthouse budget is held
  by hydrating sections on view.
- OG generation adds a headless browser step to the docs build.
