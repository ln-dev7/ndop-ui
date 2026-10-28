---
'@ndop/primitives': major
'@ndop/core': major
'@ndop/cli': minor
'@ndop/schema': minor
'@ndop/verify': minor
---

Use native modal dialogs and top-layer popovers for overlay components. Modal
content must be a native `dialog`; native Tab navigation can visit browser
controls while the background page remains inert. Core supplies native closed
states, backdrop styling and discrete transitions.

The overlay registry items remove behavior-only styled forwarding directives.
Import those parts from the primitives package. `ndop update` migrates imports,
selectors, Sheet exportAs references, native modal markup and simple static
backdrop customizations. Unsafe custom templates or overlays stop preparation
with instructions before any files are written. See the native overlay migration
guide for markup, focus behavior and customization details.

Verification recognizes directly imported primitive selectors from the installed
Angular declaration metadata, including aliases and local re-exports. Unknown
selectors still fail and the application build validates primitive bindings.

Retained native menu content updates its data-state before close transitions,
including programmatic close, Escape and light dismiss. Menubar root content
also supplies its missing exit animation class.

Preserve modal viewport position when WebKit scrolls through a fixed body,
while allowing nested content scrolling and restoring styles and position on close.

Keep native popover source association compatible with TypeScript 5.9's DOM
declarations, as required by Angular 21 consumers.
