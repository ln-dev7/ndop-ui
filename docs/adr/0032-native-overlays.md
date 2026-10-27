# ADR-0032: Native modal dialogs and top-layer popovers

- Status: Proposed in response to [issue #3](https://github.com/ndop-ui/ui/issues/3)
- Supersedes: ADR-0004's CDK modal overlay and focus-trap decision, and
  ADR-0014 amendment 3's pass-through dialog directives

## Context

The platform provides modal top-layer rendering, inertness, initial focus,
Escape handling and focus restoration through `HTMLDialogElement.showModal()`.
Recreating those features introduces competing focus and dismissal systems.
Native popovers also provide top-layer rendering for anchored overlays.

## Decision

Dialog content is a native `dialog`, declared in the application's own view.
The root keeps `open`, `defaultOpen`, `closeOnEscape` and
`closeOnOverlayClick`. Browser `cancel` and `close` events synchronize its model.
Only the active modal handles cancellation; nested popovers can consume Escape
first. The server renders closed and initial state applies after hydration.

Backdrop clicks are identified by the dialog target and coordinates outside its
bounding box, so clicks in panel padding do not dismiss it. Alert Dialog disables
backdrop dismissal and focuses its Cancel button with native `autofocus`.
Focus return has a fallback for browsers that leave focus on the document body.
A modal dialog does not itself prevent document scrolling. A reference-counted
fixed-body lock preserves the current document position, including in WebKit,
where root `overflow: hidden` alone was inconsistent under wheel input. The
last modal restores the original inline styles and scroll position. This
policy replaces the CDK scroll-block strategy because the platform does not
supply it.

Styled parts that supply no classes or behavior are replaced by imports from
the primitive. Updates migrate imports and markup, including inline templates,
without replacing user styling. The old template portal is a compatibility
adapter that instantiates a local view; it no longer uses a CDK overlay.

Exit animations use discrete `display` and `overlay` transitions with
`@starting-style`; the content remains in its declaring view after closing.
Native overlay state remains available through `data-state`.

## Consequences

Dialog no longer imports the CDK overlay or focus trap. Native content can
participate in forms (`method="dialog"`) and browser focus handling. Applications
must use a native `dialog` for content. A focused element must stay connected to
receive focus on close. Browser tests are required in Chromium, Firefox and
WebKit because DOM test environments do not implement native modality.

## Native Tab navigation

Native modality makes the background page inert, but does not remove browser
controls from sequential navigation. Chromium 153 was verified with a standalone
native dialog: Tab from its final control visits browser UI, then returns to the
first control. This is intentional platform behavior discussed in
[WHATWG HTML #8339](https://github.com/whatwg/html/issues/8339).

Ndop adopts this behavior rather than restoring a custom focus trap. The former
CDK-specific immediate-wrap contract changes explicitly in the specs. Browser
tests assert that focus can only remain inside the active modal or enter browser
UI, that re-entry selects the correct boundary, and that the inert background
cannot receive focus. Forward/reverse navigation, dynamic controls, empty
content, nested modals and focus restoration remain covered.

## Native non-modal overlays

Popover, Tooltip/Hover Card, Select, Combobox and menus promote their own
content element with the Popover API. Content remains in its declaring view,
so a listbox or submenu inside a modal remains interactive rather than being
moved into an inert document-level container. Native `toggle` events synchronize
browser dismissal, with a stale-close guard for rapid reopen. Native auto
popover nesting and source association own layering and light dismiss.

Tooltip uses `popover="hint"` so it can coexist with its parent auto popover.
Browsers without hint support use a manual popover and an Escape fallback that
consumes only the hint's dismissal. Both paths are tested in Chromium/WebKit.
CSS anchor positioning is feature-detected (both `position-anchor` and `anchor()`);
a viewport geometry fallback supplies logical RTL alignment, offsets, flipping
and shifting. Scroll, resize, direction changes and anchor/content changes
reposition; disconnected anchors close the overlay. Listeners and observers are
released on close/destruction. A browser test forces CSS anchors off and checks
scroll, resize and anchor removal.

Menu selection, typeahead and roving focus stay on the public CDK menu stack
and custom-trigger extension contracts. No private methods are patched. Local
menu content stops keyboard-event propagation into ancestor menus because CDK
portals previously supplied that event boundary through DOM separation.

Right-click context menus wait for the initiating pointer release before
showing. A trusted-event trace in Chromium/WebKit showed native light-dismiss
steps running before `pointerup` dispatch, dismissing a menu opened during
`contextmenu` on button-down. Deferring until the release handler preserves
native light dismiss for subsequent gestures. Keyboard opening remains
immediate; pending openings cancel on Escape, pointer cancellation or blur.

## Registry API and migration safety

The migrated styled families remove 39 forwarding directives and four obsolete
backdrop directives. Styling remains on content, triggers with classes, menu
items and other parts that add presentation or behavior. Sheet roots/triggers/
portal/close use the Dialog primitive selectors; menu groups use the generic
Menu primitive selectors. Sheet exportAs references migrate with the root.
Select trigger styles target `[ndSelectValue]` rather than a styled-only slot.
Removed parts no longer add their old `data-slot` attributes; custom selectors
using those slots must target the directive attribute or add an explicit slot.

Registry item major versions require both primitives and core 2.x: native
content depends on the shared native closed-state and transition styles.
`move-export` codemods preserve local aliases and barrel names. `native-dialog`
uses Angular source spans to preserve content customizations and converts simple
static Tailwind overlay classes into backdrop utilities. Unsafe namespaces,
computed templates, ambiguous pairing and behavioral/custom-CSS overlays fail
plan preparation before writing files. Users receive a manual migration message;
there is no silent removal of their customization. Local lazy portal adapters
remain compatible, though direct native content is the documented default.
Dry-run, repeat updates and a real conflict followed by `update --continue` are
covered by integration tests. Historical snapshots remain immutable.

Documentation checks load both extracted primitive API metadata and styled item
metadata. Styled selectors take precedence where both layers offer a part;
behavior-only selectors import their primitive entry point. Unknown selectors
remain errors and TypeScript/Angular snippets still compile against the actual
exports. This replaces the assumption that every public selector is styled.

## Menu bundle budget amendment

Native positioning, event synchronization and pointer/keyboard integration move
code formerly delegated to the budget-exempt CDK into Ndop. Context-only pointer
release and touch machinery is a separate directive so ordinary menu triggers
can omit it. This reduced measured menu bundles by roughly 0.2 kB gzip, while
retaining the same public CDK menu stack contract and all tested interactions.
The remaining native implementation cannot fit the previous 4 kB own-code
allowance without dropping requested fallback/interaction behavior or replacing
CDK's menu engine. This ADR proposes explicit 8 kB own-code exceptions for
Dropdown Menu, Context Menu and Menubar (amending ADR-0021 for these three
items only). The original 4 kB criterion is not met for these menus; accepting
these exceptions is a maintainer trade-off. The default allowance stays unchanged.

This is a cost tradeoff, not a claim that every overlay becomes smaller. Full
Dialog decreases by about 76% when its required CDK dependencies are included;
its own implementation grows because native scroll/focus fallbacks now belong
to Ndop. Menu bundles currently grow by about 2 kB including CDK compared with
base bb3560d. Reports include own and dependency-inclusive costs on both sides.
The size executor's optional primitiveEntries measurement keeps all exports of
the primitive entry point so removing styled forwarding exports cannot produce
a misleading primitive-only comparison. Both sides use identical dependencies,
compiler, linker, minifier and gzip settings. See the PR's validation report for
exact final measurements and the independent local visual comparison.
