# ADR-0004: Primitives on `@angular/aria` + CDK, and custom fallbacks

- Status: Accepted (approved by Valery on 2026-10-02), with Amendments 1–3
- Date: 2026-10-02
- Phase: 1
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Primitives layer (`@ndop/primitives`)"

## Context

RFC-0001 requires primitives to build on `@angular/aria` patterns and the
CDK's overlay, a11y and focus-trap utilities, and to record every piece of
custom behavior in an ADR. Phase 1 ships seven primitives: Button, Label,
Input, Separator, Dialog, Popover, Tooltip.

Checked on 2026-10-02 against the published `@angular/aria@22.2.1` and
`@angular/cdk@22.2.1` packages:

- `@angular/aria` entry points are `accordion`, `combobox`, `grid`,
  `listbox`, `menu`, `tabs`, `toolbar`, `tree`. **None covers a Phase 1
  primitive.** Its peers are `@angular/cdk` (exact version) and
  `@angular/core ^22 || ^23`.
- `@angular/cdk/overlay` exposes injector-based factories:
  `createOverlayRef(injector, config?)`, `createGlobalPositionStrategy`,
  `createFlexibleConnectedPositionStrategy(injector, origin)`,
  `createBlockScrollStrategy`, `createRepositionScrollStrategy`,
  `createCloseScrollStrategy`. `OverlayConfig` has `usePopover` to render the
  pane as a native popover in the top layer. `OverlayRef` exposes `attach`,
  `detach`, `dispose`, `keydownEvents()`, `outsidePointerEvents()`,
  `backdropClick()` and `updatePosition()`.
- `@angular/cdk/dialog` provides a `Dialog` service whose
  `CdkDialogContainer` (`<cdk-dialog-container>`) is a component that sets
  `[attr.role]` and the ARIA label attributes **on its own wrapper element**.
- `@angular/cdk/a11y` exports `FocusTrapFactory`, `InteractivityChecker`,
  `FocusMonitor`, `AriaDescriber` and `addAriaReferencedId` /
  `removeAriaReferencedId`.
- Angular 22 documents zoneless change detection as the default since v21.

## Decision

### Per-primitive foundation

| Primitive | WAI-ARIA pattern                 | Built on                                                                                                                               | Custom behavior Ndop owns                                                                                                                                |
| --------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button    | Button                           | Native `button` / `a`                                                                                                                  | `aria-disabled` and click suppression for disabled links; `data-disabled`.                                                                               |
| Label     | none (HTML `label`)              | Native `label`                                                                                                                         | Disabled and invalid state of the associated control mirrored as data attributes.                                                                        |
| Input     | none (HTML `input`)              | Native `input`; `@angular/forms`                                                                                                       | Signal Forms and `ControlValueAccessor` integration; `aria-invalid`, `data-invalid`, `data-disabled`.                                                    |
| Separator | Separator (non-focusable)        | Plain element                                                                                                                          | `role="separator"` or `role="none"` when decorative; `aria-orientation`; `data-orientation`.                                                             |
| Dialog    | Dialog (Modal)                   | CDK overlay (`createOverlayRef`, `createGlobalPositionStrategy`, `createBlockScrollStrategy`), `TemplatePortal`, `FocusTrapFactory`    | Open state, Escape and backdrop dismissal, focus restoration, title/description id wiring on the content element.                                        |
| Popover   | none; non-modal dialog semantics | CDK overlay (`createFlexibleConnectedPositionStrategy`, `createRepositionScrollStrategy`), `TemplatePortal`                            | Open state, outside-click and Escape dismissal, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, focus into content and back.                 |
| Tooltip   | Tooltip                          | CDK overlay (`createFlexibleConnectedPositionStrategy`, `createCloseScrollStrategy`), `addAriaReferencedId` / `removeAriaReferencedId` | Show on hover and focus with delays, Escape to dismiss, `role="tooltip"`, `aria-describedby` added to the trigger without clobbering the user's own ids. |

Each primitive's `spec.md` holds the authoritative roles, keyboard map, focus
and RTL rules; this table only fixes what it is built on.

### Dialog uses the overlay, not the CDK `Dialog` service

The `Dialog` service puts `role` and the ARIA attributes on
`<cdk-dialog-container>`, a wrapper Ndop doesn't render or style. RFC-0001
requires primitives to render no wrapper elements and to expose state on the
user's own elements. The service is also imperative (`open()`), while Ndop
dialogs are declarative with a `model()` open state. So the Dialog primitive
composes the same lower-level pieces the service uses (overlay, portal,
focus trap) and puts `role="dialog"`, `aria-modal`, `aria-labelledby` and
`aria-describedby` on the element marked `ndDialogContent`.

### Overlay rules shared by Dialog, Popover and Tooltip

- Overlays are created only in the browser, on first open. A `defaultOpen`
  of `true` defers creation to `afterNextRender`, so SSR renders the trigger
  and nothing else.
- Overlay content is declared in an `<ng-template>` in the user's template
  and attached as a `TemplatePortal`. The exact markup (structural directive
  or explicit `ng-template`) is fixed in Dialog's `spec.md`, the first
  overlay primitive, and reused by the others.
- CDK observables (`keydownEvents`, `outsidePointerEvents`,
  `backdropClick`) are subscribed internally and cleaned up through
  `DestroyRef`. Public APIs expose only signals, `model()` and `output()`.
- Whether overlays default to `usePopover` (native top layer) is measured in
  Phase 1, comparing stacking, focus and animation behavior in the harness,
  and recorded as an amendment here.

### Package layout: one secondary entry point per primitive

Each primitive is a secondary entry point, `@ndop/primitives/<name>`,
created with `nx g @nx/angular:library-secondary-entry-point`, the same
layout as `@angular/cdk/*`. The root entry point `@ndop/primitives` exports
nothing. Import paths are public API, so this is decided before the first
release rather than later. It also keeps each primitive's dependencies (for
example CDK overlay for Dialog) out of the others' bundles. The
`primitive` generator in `tools/workspace-plugin` is updated to wrap that
Nx generator.

### Dependencies

`@ndop/primitives` peers on `@angular/core`, `@angular/cdk` and
`@angular/forms`, each `^21.0.0 || ^22.0.0`. `@angular/aria` is added when
the first aria-backed primitive lands (Phase 6). Amendment 3 decides
against it for now.

### Phase 6 intent (recorded now, confirmed then)

Tabs on `@angular/aria/tabs`; Dropdown Menu, Context Menu and Menubar on
`@angular/aria/menu`; Select and Combobox on `@angular/aria/combobox` and
`listbox`; Accordion on `@angular/aria/accordion`; Toggle Group on
`@angular/aria/toolbar`. Each gets a fresh API check against the then-current
version.

## Consequences

- All Phase 1 behavior beyond native elements is Ndop-owned code on CDK
  utilities, and each primitive's `spec.md` plus its keyboard and axe tests
  are the guard rails for it.
- Ndop stays independent of `@angular/aria` churn until Phase 6.
- Secondary entry points add one `ng-package.json` and one tsconfig path per
  primitive; the generator writes them.

## Amendment 1 (2026-10-02): forms integration for native-element primitives

Status: Accepted by Valery on 2026-10-02. It deviates from RFC-0001
("Forms": value-bearing primitives integrate with Signal Forms and also
implement `ControlValueAccessor`).

Context, checked in `@angular/forms` 22.2.1:

- Signal Forms binds native inputs itself: `FormField` (`[formField]`)
  handles native form elements directly and exposes `state()` and
  `errors()`. `FormValueControl` and `FormUiControl` are contracts for
  custom controls that own their value.
- Reactive and template-driven forms pick a value accessor with
  `selectValueAccessor`, which prefers any custom accessor over
  `DefaultValueAccessor`. A `ControlValueAccessor` on `input[ndInput]` would
  silently replace Angular's own native-input handling, including its IME
  composition logic.

Decision:

- Primitives on native form elements (Input now; Textarea, and native
  checkbox or radio if Ndop ever uses them) **do not** implement
  `ControlValueAccessor` or `FormValueControl`. Forms bind the native
  element. The primitive reads state from `FormField` or `NgControl` on the
  same element and reflects it as ARIA and data attributes.
- Primitives that own their value without a native control (Checkbox
  button, Switch, Radio Group, Select, Combobox, Slider, Toggle, Input OTP)
  implement both contracts as the RFC requires, starting in Phase 6.
- The RFC's "Forms" bullet says this.

## Amendment 2 (2026-10-02): overlays don't use `usePopover`

Status: Applied; records the measurement this ADR asked for.

The Dialog e2e suite ran in Chromium, Firefox and WebKit with the overlay
in the CDK's overlay container (the default) and with `usePopover: true`
(native top layer). Results were identical except one: with `usePopover`,
WebKit scrolled the page behind an open dialog, so the block scroll strategy
no longer held. Ndop overlays keep the default overlay container. Revisit
when a stacking problem appears that only the top layer solves.

## Amendment 3 (2026-10-08): Phase 6 builds on the CDK, not `@angular/aria`

Status: Accepted (approved by Valery on 2026-10-08). **Deviation** from
RFC-0001's "Build on `@angular/aria` and the CDK".

The Phase 6 intent above was checked against `@angular/aria` 22.2.1 and
21.2.14, read from their published type definitions:

- **The API changes between majors.** `combobox` was rewritten in 22
  (`ngComboboxInput` and an attribute `ngComboboxPopup` in 21;
  `ngComboboxWidget`, an `ng-template` popup and `value`/`expanded` models
  in 22). `toolbar` lost its `values` selection model in 22. One
  `@ndop/primitives` build can't serve both.
- `@angular/aria` 22 peers on the exact same `@angular/cdk` version, so
  apps must keep the two in lockstep or installs fail.
- aria has no positioning: popups still need the CDK overlay.
- A new Angular major comes about every six months, and each can change
  aria again.

### Decision

- `@ndop/primitives` doesn't use or peer on `@angular/aria`. Primitives
  build on the CDK and on Ndop-owned code, as the Phase 1 primitives do,
  each guarded by its `spec.md` and its keyboard and axe tests. Users see
  the same API on every supported major and install nothing extra.
- **When to revisit:** once aria's API is unchanged across two consecutive
  majors, an amendment can move primitives onto it. Users import only
  `@ndop/primitives`, so the move doesn't change their code.

| Primitive                 | Built on                                                      | Custom behavior Ndop owns                                                                                       |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tabs                      | CDK `FocusKeyManager`                                         | Tabs pattern: roles, roving focus, automatic or manual activation, orientation, RTL, `data-state`.              |
| Accordion                 | `@angular/cdk/accordion`                                      | Heading and button markup, `aria-expanded`/`aria-controls`, single or multiple mode, `data-state`.              |
| Collapsible               | Native `button`                                               | `aria-expanded`/`aria-controls` disclosure, open state.                                                         |
| Dropdown Menu, Menubar    | `@angular/cdk/menu`                                           | Placement through Ndop's `NdPlacement`, `data-state`/`data-highlighted`, checkbox and radio item styling hooks. |
| Context Menu              | `@angular/cdk/menu` (`CdkContextMenuTrigger`)                 | As Dropdown Menu.                                                                                               |
| Select                    | `@angular/cdk/listbox` + CDK overlay                          | The trigger (`role="combobox"`, select-only pattern), value display, typeahead on the closed trigger.           |
| Combobox, Command         | CDK `ActiveDescendantKeyManager` (+ CDK overlay for Combobox) | Editable combobox pattern: filtering, `aria-activedescendant`, empty state. Command is the same list, inline.   |
| Calendar                  | CDK `FocusKeyManager`                                         | Date grid pattern, date math on `Date` and `Intl`, month paging, range selection, `aria-current="date"`.        |
| Checkbox, Switch, Toggle  | Native `button`                                               | `role="checkbox"` (with `mixed`) / `role="switch"` / `aria-pressed`; value and forms integration.               |
| Radio Group, Toggle Group | CDK `FocusKeyManager`                                         | Roving tabindex with arrow keys, RTL-aware; single or multiple selection; forms integration.                    |
| Slider                    | Plain elements                                                | `role="slider"` thumbs, pointer and keyboard (arrows, Page Up/Down, Home/End), ranges, RTL.                     |
| Input OTP                 | Native `input`                                                | One real input with visual slots, paste, pattern filtering, forms integration.                                  |
| Alert Dialog              | The Dialog primitive's internals                              | `role="alertdialog"`, no outside dismissal, initial focus on the cancel action.                                 |
| Drawer                    | The Dialog primitive's internals                              | Drag to dismiss with pointer events, honoring reduced motion.                                                   |
| Hover Card                | The Tooltip primitive's internals                             | Open and close delays for hover and focus; content stays open while hovered.                                    |
| Navigation Menu           | Native `button` and `a` + CDK overlay                         | Disclosure navigation pattern (not menu roles), one panel at a time, Escape returns focus.                      |
| Toast                     | CDK overlay (global) + a polite live region                   | Queue, stacking, timers paused on hover and focus, swipe to dismiss, F8 to focus the region.                    |
| Avatar                    | Native `img`                                                  | Load status (`loading`, `loaded`, `error`) to show the fallback.                                                |
| Progress                  | Plain element                                                 | `role="progressbar"` with `aria-valuenow`/`min`/`max`, indeterminate state.                                     |
| Resizable                 | Plain elements                                                | Window splitter pattern: focusable `role="separator"` handles, arrow keys, pointer drag, sizes as a `model()`.  |
| Sidebar                   | CDK `BreakpointObserver`; the Dialog primitive on mobile      | Expanded or collapsed state, keyboard shortcut, mobile sheet.                                                   |
| Form Field                | `@angular/forms` state                                        | Ids and `aria-describedby` for the description and error, shown when the control is invalid and touched.        |

Each CDK class is checked against the installed version before its
primitive is written. Where a CDK directive puts roles or structure on
elements in a way the primitive's `spec.md` can't accept, the primitive
uses a key manager and its own bindings instead, and its `spec.md` says so.

Value-bearing primitives here implement both `ControlValueAccessor` and
Signal Forms' `FormValueControl`, as amendment 1 requires.
