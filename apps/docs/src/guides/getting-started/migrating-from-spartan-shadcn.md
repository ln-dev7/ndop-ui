---
title: Migrating from spartan/shadcn
description: Bring Ndop into an app that uses spartan/ui or shadcn-style components, keep your theme, and let ndop take over files you copied.
order: 10
---

Ndop follows shadcn/ui closely: its styled items use the classes of
shadcn/ui's new-york-v4 style, its themes use shadcn's token names, and its
registry format is a superset of shadcn's. Coming from spartan/ui or from
shadcn itself, most of what you know carries over. What Ndop adds is
`ndop update`, which merges new versions into the files you've edited.

This guide was checked against spartan/ui 1.6.3 (`@spartan-ng/brain` and
`@spartan-ng/cli`), read from their published packages, and the shadcn CLI
4.21.4, the version Ndop's install test runs.

## What carries over

- **Tokens.** `--background`, `--primary`, `--radius` and the rest have
  shadcn's names, in `:root` and `.dark`, so a shadcn or spartan theme's
  values paste in unchanged. `ndop add` also installs shadcn themes
  published as `registry:style` items, such as tweakcn's:

  ```bash pm
  npx @ndop/cli add theme:https://example.com/r/ocean.json
  ```

- **Classes.** Each styled item's `variants()` table holds the class
  strings of the shadcn/ui new-york-v4 item it follows, and a test per item
  compares the two. spartan 1.6 keeps its classes in a stylesheet per design
  style instead (`.style-vega` by default), so expect small visual
  differences from spartan.
- **`cn()` and variants.** `cn()` merges classes with clsx and
  tailwind-merge, as shadcn's does. `variants()` takes the same parts as
  cva: `base`, `variants`, `compoundVariants` and `defaults`.
- **Names.** Parts keep shadcn's names: `DialogContent`, `CardHeader`,
  `SelectTrigger`. In templates they're attributes with the `nd` prefix,
  such as `ndDialogContent`.
- **The registry.** Items have shadcn's fields (`files`,
  `dependencies`, `registryDependencies`, `cssVars`) plus Ndop's own, and
  `ndop.json` takes namespaced `registries` as `components.json` does; see
  [ndop.json](/docs/getting-started/ndop-json).

## What changes

- **Directives only.** spartan renders some parts as elements, such as
  `<hlm-checkbox>`, `<hlm-dialog>` and `<hlm-select-trigger>`. Every Ndop
  part is a directive on an element you write: `<button ndCheckbox>`,
  `<ng-container ndDialog>`, `<button ndSelectTrigger>`.
- **Portals are templates.** Content that opens over the page, such as a
  dialog's or a tooltip's, goes in an `ng-template` with a portal
  directive, as Radix's `Portal` does in shadcn.
- **No `asChild`.** Put the directive on the element itself:
  `<a ndButton href="/docs">` instead of a slot.
- **One import path per component.** `ndop add dialog` writes
  `src/app/ui/dialog/dialog.ts`, imported as `@/ui/dialog/dialog`.
- **Icons.** Items ask for icons by name, `<svg ndIcon="x">`, from Lucide
  through your `icons.ts` file.

## Components

spartan/ui's items and Ndop's mostly share names, and attribute parts map
`hlm<Part>` to `nd<Part>`: `hlmCardTitle` becomes `ndCardTitle`. The table
lists where they differ.

| spartan/ui                                                                         | Ndop                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hlmBtn`                                                                           | [Button](/docs/components/button): `ndButton`. Same variants and sizes.                                                                                                                                                                                                               |
| `hlm-checkbox`, `hlm-switch`                                                       | [Checkbox](/docs/components/checkbox), [Switch](/docs/components/switch). Directives on a `button`, with an `ndCheckboxIndicator` or `ndSwitchThumb` inside.                                                                                                                          |
| `hlm-radio-group`, `hlm-radio`                                                     | [Radio Group](/docs/components/radio-group): `ndRadioGroup`, `ndRadioGroupItem`. Each item is a `button` with a `value`.                                                                                                                                                              |
| `hlm-slider`                                                                       | [Slider](/docs/components/slider): `ndSlider`, `ndSliderTrack`, `ndSliderRange`, `ndSliderThumb`. You write the track, range and thumbs.                                                                                                                                              |
| `hlm-select` and its parts                                                         | [Select](/docs/components/select): `ndSelect`, `ndSelectTrigger`, `ndSelectValue`, `ndSelectItem`. Single choice; for several, use Combobox with `multiple`.                                                                                                                          |
| `hlm-combobox`, `hlm-autocomplete`                                                 | [Combobox](/docs/components/combobox): `ndCombobox`, `ndComboboxInput`, `ndComboboxItem`. One item covers both, with chips for `multiple`.                                                                                                                                            |
| `hlm-dialog`, `hlm-dialog-content`, `hlmDialogTrigger`                             | [Dialog](/docs/components/dialog): `ndDialog`, `ndDialogPortal`, `ndDialogContent`. Content goes in an `ng-template ndDialogPortal`. `ndDialogCloseButton` is the corner close button.                                                                                                |
| `hlm-alert-dialog`, `hlm-sheet`, `hlm-drawer`                                      | [Alert Dialog](/docs/components/alert-dialog), [Sheet](/docs/components/sheet), [Drawer](/docs/components/drawer). Same shape as Dialog.                                                                                                                                              |
| `hlmPopover`, `hlmHoverCard`                                                       | [Popover](/docs/components/popover), [Hover Card](/docs/components/hover-card). Content goes in a portal template.                                                                                                                                                                    |
| `hlmTooltip`                                                                       | [Tooltip](/docs/components/tooltip): `ndTooltip`, `ndTooltipTrigger`, `ndTooltipContent`. The content is always a template, in an `ndTooltipPortal`.                                                                                                                                  |
| `hlmDropdownMenu`, `hlmDropdownMenuTrigger`, `hlmContextMenuTrigger`, `hlmMenubar` | [Dropdown Menu](/docs/components/dropdown-menu), [Context Menu](/docs/components/context-menu), [Menubar](/docs/components/menubar). Each trigger takes an `ng-template` holding the menu's content part, such as `ndDropdownMenuContent`, and each component has its own item parts. |
| `hlmTabs`, `hlmTabsTrigger`, `hlmTabsContent`                                      | [Tabs](/docs/components/tabs): `ndTabs`, `ndTabsTrigger`, `ndTabsContent`. `[(value)]` on `ndTabs`, and a `value` input on each trigger and panel, name the tabs.                                                                                                                     |
| `hlm-command-input`, `hlmCommandGroupLabel`                                        | [Command](/docs/components/command): `ndCommandInput`, `ndCommandGroupHeading`. The input is an `input` inside an `ndCommandInputWrapper`.                                                                                                                                            |
| `hlmInputOtp`, `hlm-input-otp-slot`                                                | [Input OTP](/docs/components/input-otp): `ndInputOtp`, `ndInputOtpInput`, `ndInputOtpSlot`. One real `input`, plus a slot per character with its `index`.                                                                                                                             |
| `hlmAccordion` and its parts                                                       | [Accordion](/docs/components/accordion): `ndAccordion`, `ndAccordionTrigger`. `multiple` replaces `type`; the trigger sits in an `ndAccordionHeader`.                                                                                                                                 |
| `hlmField` and its parts                                                           | [Form Field](/docs/components/form-field): `ndField`, `ndFieldLabel`, `ndFieldError`. The item is called `form-field`.                                                                                                                                                                |
| `hlm-avatar`, `hlm-spinner`, `hlm-breadcrumb-ellipsis`, `hlm-pagination-next`      | [Avatar](/docs/components/avatar), [Spinner](/docs/components/spinner), [Breadcrumb](/docs/components/breadcrumb), [Pagination](/docs/components/pagination). Attributes instead of elements, with the same names.                                                                    |
| `hlm-calendar`, `hlm-calendar-range`, `hlm-calendar-multi`                         | [Calendar](/docs/components/calendar): `ndCalendar`. One calendar with `mode="single"`, `"range"` or `"multiple"`, and its grid parts in your template.                                                                                                                               |
| `hlm-date-picker` and its variants                                                 | [Date Picker](/docs/components/date-picker): Popover, `ndDatePickerTrigger` and Calendar. Composed from those three, with no typed input.                                                                                                                                             |
| `hlm-toaster`, `toast()`                                                           | [Toast](/docs/components/toast): `ndToaster`, `Toaster`. `inject(Toaster).show({ title })` instead of `toast()`.                                                                                                                                                                      |
| `hlmResizableGroup`, `hlm-resizable-handle`                                        | [Resizable](/docs/components/resizable): `ndResizablePanelGroup`, `ndResizableHandle`. Sizes are a `[(sizes)]` model on the group.                                                                                                                                                    |
| `ng-scrollbar[hlm]`                                                                | [Scroll Area](/docs/components/scroll-area): `ndScrollArea`. Styles the native scrollbar; no ngx-scrollbar.                                                                                                                                                                           |
| `tanstack-chart[hlmChart]`                                                         | [Chart](/docs/components/chart): `ndChartContainer`, `ndChartPlot`. Ndop's own SVG parts, with no chart library.                                                                                                                                                                      |
| `hlm-sidebar` and its parts                                                        | [Sidebar](/docs/components/sidebar): `ndSidebarProvider`, `ndSidebar`. `ndSidebarProvider` holds the open state.                                                                                                                                                                      |
| `hlmTable` and its parts                                                           | [Table](/docs/components/table): `ndTable`, `ndTableRow`, `ndTableCell`. The long names only; `hlmTr` and `hlmTd` have no short form. Sorting and pages come from [Data Table](/docs/components/data-table).                                                                          |

Alert, Aspect Ratio, Badge, Card, Collapsible, Empty, Input, Label,
Navigation Menu, Progress, Separator, Skeleton, Textarea, Toggle and Toggle
Group follow the `hlm` to `nd` rule; each component's page lists its parts.

spartan's attachment, bubble, button group, carousel, input group, item,
kbd, marker, message, message scroller, native select, questionnaire and
typography have no Ndop item.

## Setting up Ndop in your app

`ndop init` works in an existing Angular CLI app, alongside the components
you have. spartan's files stay where its `components.json` put them, and
Ndop's go where `ndop.json` says, `src/app/ui` by default.

:::steps

### Restore the Tailwind import

`ndop init` recognizes Tailwind by `@import 'tailwindcss'` in your global
stylesheet. spartan's `init` replaces that line with imports of Tailwind's
parts; put it back, so Tailwind isn't added a second time:

```css title="src/styles.css"
@layer theme, base, components, utilities; /* [!code --] */
@import 'tailwindcss/theme.css' layer(theme); /* [!code --] */
@import 'tailwindcss/preflight.css' layer(base); /* [!code --] */
@import 'tailwindcss/utilities.css'; /* [!code --] */
@import 'tailwindcss'; /* [!code ++] */
```

### Run init

Commit your work, then preview the changes and apply them:

```bash pm
npx @ndop/cli init --dry-run
```

```bash pm
npx @ndop/cli init
```

`init` imports `@ndop/core/styles.css` after your other imports. Leave it
after spartan's preset: both define Tailwind's `dark` variant, the last
definition wins, and Ndop's is the one that also follows the system
scheme.

### Keep one theme

`init` writes the default theme's values into `:root`, replacing variables
with the same names, and adds `.dark` blocks. spartan's `:root.dark` block
is more specific than `.dark`, so in dark mode its values would still win.
Delete it, then put the values you want in Ndop's blocks: your old ones,
which `git diff` shows, or a theme from the [gallery](/themes).

:::

From then on, spartan's and Ndop's components work side by side, so you
can replace them a screen at a time.

## Files you copied

If you copied Ndop's files by hand, from a component page's Manual tab, or
installed them with the shadcn CLI from `https://ndop.dev/r/compat/`, let
`ndop` take them over, so `ndop update` can merge new versions into them.

`ndop add` writes a file only when it's new, or still matches what Ndop
installed. A copy that differs, even only in its import paths, is reported
as skipped and not recorded:

```bash pm
npx @ndop/cli add dialog
```

To adopt it, record the version you copied as its base, then put your
copy back:

:::steps

### Install the version you copied

With your work committed, overwrite the copy with that version. Each
component's changelog lists its versions.

```bash pm
npx @ndop/cli add dialog@0.1.0 --overwrite
```

### Restore your copy

```bash
git restore src/app/ui/dialog/dialog.ts
```

`ndop.lock.json` now records that version and its hash, and your file
counts as an edit of it. `--overwrite` also replaces edited files of the
items it depends on, such as `utils.ts`; `git status` lists them, and
`git restore` brings them back the same way.

### Update

Commit, then update:

```bash pm
npx @ndop/cli update dialog
```

`ndop update` merges the changes made upstream since that version into
your copy, keeping your edits, the way `git merge` does. Where you and
upstream changed the same lines, it writes conflict markers for you to
resolve.

:::

If you don't know which version you copied, install the latest instead.
`ndop diff dialog` then shows every difference as your edit, including
upstream changes your copy predates, so review it once.

## Next steps

- [CLI](/docs/getting-started/cli) covers `ndop diff` and `ndop update` in
  detail.
- [Theming](/docs/getting-started/theming) lists every token.
- [Build your own registry](/docs/patterns/build-your-own-registry) if you
  publish components of your own.
