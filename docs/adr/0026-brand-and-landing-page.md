# ADR-0026: Brand, landing page and OG images

- Status: Accepted (approved by Valery on 2026-10-12), with amendments 1–2
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

- The logo's SVG masters live in `apps/docs/brand/`. The build serves
  them at `/brand/*.svg` and generates every PNG and ICO size from them,
  so no raster copy is committed.
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

## Amendment 1 (2026-10-13): a centered hero above a component showcase

Status: Accepted by Valery on 2026-10-13.

Built as specified, the two-column hero set one form card and a chart
against the copy, and the large cropped leaf, at a tint quiet enough not
to compete, read as stray diamonds rather than the mark. Valery chose a
centered hero above a broad showcase instead.

- **Hero:** centered copy: the pill (with the small mark), the headline,
  the pitch, the calls to action beside `npx ndop init`, and the trust
  line.
- **Showcase:** below the hero, a masonry grid of real registry items in
  small, realistic cards (forms, a calendar, a chart, a data table, a
  command menu, settings, and more), with the theme picker in a bar above
  it restyling the whole grid. It opens on the default theme, and its
  bottom fades into the page. On phones it shows a curated subset in one
  column. It is prerendered and hydrates as it scrolls into view.
- **Pattern:** the diamond bands frame the showcase (a full-width strip
  along its top edge, faint bands in the side gutters) and never sit
  behind text. The large cropped hero mark is dropped; the mark appears
  in the header, footer, pill, icons and OG images.
- This replaces section 1 ("Hero") of the decision's landing page; the
  other sections follow it unchanged.

## Amendment 2 (2026-10-13): block thumbnails from the built site

Status: Accepted by Valery on 2026-10-13.

The landing page's blocks section shows real thumbnails. The docs build
takes them itself, after prerendering, by photographing each block's
preview page in Playwright's Chromium, in light and dark, and writing
WebP at several widths through Chromium's own canvas. No image library is
added.

- The step is reusable: OG images (step 5) take their component renders
  the same way.
- Shots are cached by a content hash of their inputs, so a build only
  photographs blocks that changed.
- CI's build job installs Chromium for it.
- The dev server, which doesn't prerender, shows a placeholder card in
  their place.
