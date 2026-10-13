---
title: Migrating from Angular Material
description: Move an Angular Material app to Ndop one screen at a time, with a map of components, the theming equivalents and the CDK both build on.
order: 9
---

Angular Material and Ndop can run in the same app, so you can move one
screen at a time. Both build their overlays, focus handling and keyboard
support on the Angular CDK, so the two behave alike while they share a page.

This guide was checked against `@angular/material` 22.2.1 and
`@angular/cdk` 22.2.1, read from their published packages.

## What changes

Material's components are installed from npm and styled by its Sass theme.
Ndop's styled items are source files in your app: directives that put
Tailwind classes on elements you write.

```angular-html
<!-- Angular Material -->
<button matButton="filled">Save</button>

<!-- Ndop -->
<button ndButton>Save</button>
```

- **Directives, not elements.** `<mat-checkbox>` renders its own control
  and label. `ndCheckbox` goes on your `button`, and its label is a
  separate `label` element.
- **Templates, not services.** A Material dialog is a component passed to
  `MatDialog.open()`. An Ndop dialog's content is an `ng-template` in the
  page, opened by its trigger or by binding `[(open)]`.
- **Models for state.** Open, value and checked state are two-way bindable
  models, such as `[(value)]` on Tabs, which takes a string, not an index.
- **Styles are yours.** There are no `*-overrides` mixins: edit the
  classes in your copy of the item, or pass `class`, which is merged last.

## Components

| Angular Material                                                                                     | Ndop                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matButton`, `matIconButton`, `matFab`, `matMiniFab`                                                 | [Button](/docs/components/button): `ndButton`. `variant` is `default`, `destructive`, `outline`, `secondary`, `ghost` or `link`, not an appearance. `size="icon"` replaces icon buttons. No FAB.                                                                                               |
| `mat-button-toggle-group`, `mat-button-toggle`                                                       | [Toggle Group](/docs/components/toggle-group): `ndToggleGroup`, `ndToggleGroupItem`. `type="single"` or `"multiple"` replaces `multiple`; `value` is always an array. A lone toggle is [Toggle](/docs/components/toggle): `ndToggle` with `[(pressed)]`.                                       |
| `mat-form-field`, `mat-label`, `mat-hint`, `mat-error`                                               | [Form Field](/docs/components/form-field): `ndField`, `ndFieldLabel`, `ndFieldDescription`, `ndFieldError`. No floating label or appearances. `invalid` on the field and its control replaces the error state matcher.                                                                         |
| `matInput` on `input`, `textarea`                                                                    | [Input](/docs/components/input): `ndInput`; [Textarea](/docs/components/textarea): `ndTextarea`. The value stays with your forms library: Signal Forms, reactive or template-driven.                                                                                                           |
| `mat-checkbox`                                                                                       | [Checkbox](/docs/components/checkbox): `ndCheckbox`, `ndCheckboxIndicator`. On a `button`, with a separate `label`. `[(checked)]` and `[(indeterminate)]` are models.                                                                                                                          |
| `mat-radio-group`, `mat-radio-button`                                                                | [Radio Group](/docs/components/radio-group): `ndRadioGroup`, `ndRadioGroupItem`. `[(value)]` on the group; each item is a `button` with a `value`.                                                                                                                                             |
| `mat-slide-toggle`                                                                                   | [Switch](/docs/components/switch): `ndSwitch`, `ndSwitchThumb`. On a `button`, with `[(checked)]`.                                                                                                                                                                                             |
| `mat-slider`, `matSliderThumb`                                                                       | [Slider](/docs/components/slider): `ndSlider`, `ndSliderTrack`, `ndSliderRange`, `ndSliderThumb`. Each thumb holds its own `[(value)]`; a range has two thumbs.                                                                                                                                |
| `mat-select`, `mat-option`, `mat-optgroup`                                                           | [Select](/docs/components/select): `ndSelect`, `ndSelectTrigger`, `ndSelectContent`, `ndSelectItem`. Single choice only; for several, use Combobox with `multiple`.                                                                                                                            |
| `matAutocomplete`, `mat-autocomplete`                                                                | [Combobox](/docs/components/combobox): `ndCombobox`, `ndComboboxInput`, `ndComboboxItem`. Filtering is built in, through the `filter` input.                                                                                                                                                   |
| `mat-chip-grid`, `matChipInputFor`                                                                   | [Combobox](/docs/components/combobox) with `multiple`: `ndComboboxChips`, `ndComboboxChip`. Chips show the chosen values; `[(values)]` holds them. For chips that only display, use [Badge](/docs/components/badge).                                                                           |
| `mat-datepicker`, `matDatepicker`, `mat-date-range-picker`                                           | [Date Picker](/docs/components/date-picker): Popover, `ndDatePickerTrigger` and Calendar. Values are `Date`s, with no `DateAdapter`. `min`, `max` and `disabledDates` on the calendar replace the filter. No typed input.                                                                      |
| `mat-calendar`                                                                                       | [Calendar](/docs/components/calendar): `ndCalendar`. `mode` is `single`, `multiple` or `range`, with `[(value)]`, `[(values)]` or `[(range)]`.                                                                                                                                                 |
| `MatDialog`, `mat-dialog-title`, `mat-dialog-content`, `mat-dialog-actions`, `mat-dialog-close`      | [Dialog](/docs/components/dialog): `ndDialog`, `ndDialogContent`, `ndDialogTitle`, `ndDialogFooter`. Declared in the template, not opened by a service. `[closeOnEscape]` and `[closeOnOverlayClick]` replace `disableClose`. Confirmations use [Alert Dialog](/docs/components/alert-dialog). |
| `MatBottomSheet`                                                                                     | [Drawer](/docs/components/drawer) or [Sheet](/docs/components/sheet) with `side="bottom"`. Declared in the template, like Dialog.                                                                                                                                                              |
| `mat-sidenav-container`, `mat-sidenav`, `mat-drawer`                                                 | [Sidebar](/docs/components/sidebar): `ndSidebarProvider`, `ndSidebar`, `ndSidebarInset`. `collapsible` is `offcanvas`, `icon` or `none`; on phones the sidebar opens as a modal sheet. For a panel over the page, use Sheet.                                                                   |
| `mat-menu`, `matMenuTriggerFor`, `mat-menu-item`                                                     | [Dropdown Menu](/docs/components/dropdown-menu): `[ndDropdownMenuTrigger]="menu"`, `ndDropdownMenuItem`. The trigger takes an `ng-template`, as `matMenuTriggerFor` takes a menu; items emit `(triggered)`.                                                                                    |
| `matContextMenuTriggerFor`                                                                           | [Context Menu](/docs/components/context-menu): `[ndContextMenuTrigger]="menu"`. Same shape as Dropdown Menu.                                                                                                                                                                                   |
| `matTooltip`                                                                                         | [Tooltip](/docs/components/tooltip): `ndTooltip`, `ndTooltipTrigger`, `ndTooltipContent`. The content is a template, not a string. `side` and `align` replace `matTooltipPosition`; `openDelay` and `closeDelay` replace the show and hide delays.                                             |
| `mat-tab-group`, `mat-tab`                                                                           | [Tabs](/docs/components/tabs): `ndTabs`, `ndTabsList`, `ndTabsTrigger`, `ndTabsContent`. Tabs are named by `value`, not by index. Tab links (`mat-tab-nav-bar`) have no equivalent.                                                                                                            |
| `mat-accordion`, `mat-expansion-panel`                                                               | [Accordion](/docs/components/accordion): `ndAccordion`, `ndAccordionItem`, `ndAccordionTrigger`. `multiple` replaces `multi`. A single panel is [Collapsible](/docs/components/collapsible).                                                                                                   |
| `mat-card` and its parts                                                                             | [Card](/docs/components/card): `ndCard`, `ndCardHeader`, `ndCardTitle`, `ndCardContent`, `ndCardFooter`. `ndCardDescription` replaces the subtitle; `ndCardFooter` holds the actions.                                                                                                          |
| `mat-divider`                                                                                        | [Separator](/docs/components/separator): `ndSeparator`. `orientation="vertical"` replaces `vertical`.                                                                                                                                                                                          |
| `mat-progress-bar`                                                                                   | [Progress](/docs/components/progress): `ndProgress`, `ndProgressIndicator`. Indeterminate while `value` is `null`. No buffer mode.                                                                                                                                                             |
| `mat-progress-spinner`, `mat-spinner`                                                                | [Spinner](/docs/components/spinner): `ndSpinner`. Indeterminate only, with a `label` for screen readers.                                                                                                                                                                                       |
| `MatSnackBar`                                                                                        | [Toast](/docs/components/toast): `Toaster`, `ndToaster`. `inject(Toaster).show({ title, action })`; the toast region goes once in your app's shell.                                                                                                                                            |
| `matBadge`                                                                                           | [Badge](/docs/components/badge): `ndBadge`. A label of its own, not an overlay on another element; on an avatar, use `ndAvatarBadge`.                                                                                                                                                          |
| `mat-table`, `matSort`, `mat-sort-header`                                                            | [Table](/docs/components/table) and [Data Table](/docs/components/data-table): `createDataTable`. A native `table` with `@for` over `rows()`; sorting, search, pages and selection are signals.                                                                                                |
| `mat-paginator`                                                                                      | [Pagination](/docs/components/pagination): `ndPagination`, `ndPaginationLink`. Links or buttons you render; a data table's `pageIndex` and `pageCount` drive them.                                                                                                                             |
| `mat-icon`                                                                                           | `ndIcon` from `@ndop/core`. `<svg ndIcon="x">` with Lucide icons by default, or any icon component you prefer.                                                                                                                                                                                 |
| `mat-toolbar`, `mat-list`, `mat-grid-list`, `mat-stepper`, `mat-tree`, `mat-timepicker`, `matRipple` | None. Use plain markup with Tailwind classes, or keep the Material component.                                                                                                                                                                                                                  |

Ndop also has components Material doesn't: [Command](/docs/components/command),
[Popover](/docs/components/popover), [Hover Card](/docs/components/hover-card),
[Navigation Menu](/docs/components/navigation-menu),
[Resizable](/docs/components/resizable) and
[Chart](/docs/components/chart), among others.

### A dialog, before and after

With Material, the dialog is a component that a service opens:

```angular-html title="delete-dialog.html"
<h2 mat-dialog-title>Delete project?</h2>
<mat-dialog-content>Its tasks are deleted for everyone.</mat-dialog-content>
<mat-dialog-actions align="end">
  <button matButton mat-dialog-close>Cancel</button>
  <button matButton="filled" [mat-dialog-close]="true">Delete</button>
</mat-dialog-actions>
```

With Ndop, a confirmation is an [Alert Dialog](/docs/components/alert-dialog)
in the page that asks:

```angular-html
<ng-container ndAlertDialog>
  <button ndButton variant="destructive" ndAlertDialogTrigger>Delete project</button>
  <ng-template ndAlertDialogPortal>
    <div ndAlertDialogOverlay></div>
    <div ndAlertDialogContent>
      <div ndAlertDialogHeader>
        <h2 ndAlertDialogTitle>Delete project?</h2>
        <p ndAlertDialogDescription>Its tasks are deleted for everyone.</p>
      </div>
      <div ndAlertDialogFooter>
        <button ndAlertDialogCancel>Cancel</button>
        <button ndAlertDialogAction variant="destructive" (click)="remove()">Delete</button>
      </div>
    </div>
  </ng-template>
</ng-container>
```

Both buttons close the dialog, and focus returns to the trigger.

## Theming

Material builds its theme in Sass, with `mat.theme()`, and exposes it as
`--mat-sys-*` CSS variables. Ndop's theme is plain CSS variables with
shadcn/ui's names, written into your stylesheet by `ndop init`; see
[Theming](/docs/getting-started/theming).

| Angular Material                                       | Ndop                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `mat.theme()` with `color`, `typography` and `density` | The `:root` and `.dark` blocks in your stylesheet; edit them, or add a gallery theme.            |
| Prebuilt themes, such as `azure-blue.css`              | [Gallery themes](/themes), such as `ndop add theme:rose`.                                        |
| `mat.<component>-overrides()`                          | The classes in your copy of the item, or its `class` input.                                      |
| `typography: Roboto`                                   | `--font-sans` in the `@theme` block.                                                             |
| `density: -1` and lower                                | `data-density="compact"` on any element, for its subtree; also `comfortable`.                    |
| `color-scheme` and `light-dark()`                      | The `.dark` class, managed by `provideNdop()`; see [Dark mode](/docs/getting-started/dark-mode). |

To carry your palette over, set each Ndop token to the Material color in
the same role:

| Material system variable                                            | Ndop token                                         |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| `--mat-sys-surface`, `--mat-sys-on-surface`                         | `--background`, `--foreground`                     |
| `--mat-sys-primary`, `--mat-sys-on-primary`                         | `--primary`, `--primary-foreground`                |
| `--mat-sys-secondary-container`, `--mat-sys-on-secondary-container` | `--secondary`, `--secondary-foreground`            |
| `--mat-sys-surface-container`                                       | `--card`, `--popover`                              |
| `--mat-sys-surface-container-high`                                  | `--muted`, `--accent`                              |
| `--mat-sys-on-surface-variant`                                      | `--muted-foreground`                               |
| `--mat-sys-error`, `--mat-sys-on-error`                             | `--destructive`, `--destructive-foreground`        |
| `--mat-sys-outline-variant`, `--mat-sys-outline`                    | `--border`, `--input`                              |
| `--mat-sys-corner-*`                                                | `--radius`, from which the radius scale is derived |

The [theme studio](/themes/studio) shows the contrast of each pair as you
edit, and exports the result as CSS or as a theme URL for `ndop add`.

## The CDK they share

Ndop's primitives use the same CDK as Material: overlays and positioning,
focus traps and key managers from `a11y`, `bidi` for text direction, and
CDK menu, listbox and accordion. In one app:

- Both libraries' overlays open in the CDK's one overlay container, and
  both read `dir` through `Directionality`, so a right-to-left page is
  right-to-left everywhere.
- Material 22.2.1 requires `@angular/cdk` at exactly its own version.
  `ndop add` installs the CDK only when `package.json` doesn't list it, so
  it keeps the version Material needs.
- CDK features you use directly, such as drag and drop, virtual scrolling
  and `BreakpointObserver`, don't depend on Material and keep working.
- When you remove `@angular/material`, keep `@angular/cdk`:
  `@ndop/primitives` needs it.

## Migrating step by step

:::steps

### Give Tailwind a CSS stylesheet

`ndop init` writes Tailwind and the theme into your app's first global
stylesheet, which must be a `.css` file. If yours is `styles.scss`, list a
CSS file before it in the build's `styles` in `angular.json`, and keep
Material's Sass where it is. `init` creates the file:

```json title="angular.json"
"styles": ["src/tailwind.css", "src/styles.scss"]
```

### Set up Ndop

Commit your work, then preview the changes and apply them:

```bash pm
npx ndop init --dry-run
```

```bash pm
npx ndop init
```

### Follow one color scheme

Material's colors follow `color-scheme`, and Ndop's follow the `.dark`
class and `data-ndop-theme="system"` that `provideNdop()` sets on the root
element. Replace the `color-scheme` that Material's `ng add` set on `body`
with rules that follow Ndop's:

```css title="src/tailwind.css"
html {
  color-scheme: light;
}
html.dark {
  color-scheme: dark;
}
html[data-ndop-theme='system'] {
  color-scheme: light dark;
}
```

### Move a screen at a time

Add the components a screen needs, and replace its Material components
with the map above:

```bash pm
npx ndop add button dialog form-field input
```

Material's global styles aren't in a CSS layer, so they win over
Tailwind's, which are. While Material is in the app, the `body` rule its
setup wrote sets the page's background, text color and font. If your Sass
includes `mat.typography-hierarchy()`, its `.mat-typography` class also
styles the headings below it, Ndop's included.

### Remove Material

Once no template uses Material, uninstall `@angular/material`, and delete
`mat.theme()`, the `body` rule and any typography hierarchy from your
Sass. Ndop's base styles then set the page's background, text color and
font from your theme.

:::

## Next steps

- [Theming](/docs/getting-started/theming) and
  [Dark mode](/docs/getting-started/dark-mode) cover the tokens in detail.
- [CLI](/docs/getting-started/cli) explains `ndop update`, which merges
  later versions into the components you've edited.
