# @ndop/primitives

Headless, signal-based Angular directives for state, keyboard, focus, ARIA and
overlay wiring. No styles. Zoneless, SSR-safe, and tested against each
primitive's written accessibility contract.

## Install

```bash
pnpm add @ndop/primitives @angular/cdk
```

## Usage

Each primitive is its own entry point (ADR-0004):

```ts
import { NdDialog, NdDialogContent, NdDialogTrigger } from '@ndop/primitives/dialog';
```

| Entry point                        | Directives                                                                                                                                                                 | Contract                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `@ndop/primitives/accordion`       | `NdAccordion`, `…Item`, `…Header`, `…Trigger`, `…Content`                                                                                                                  | [spec.md](accordion/spec.md)       |
| `@ndop/primitives/alert-dialog`    | `NdAlertDialog`, `…Trigger`, `…Portal`, `…Overlay`, `…Content`, `…Title`, `…Description`, `…Cancel`, `…Action`                                                             | [spec.md](alert-dialog/spec.md)    |
| `@ndop/primitives/avatar`          | `NdAvatar`, `…Image`, `…Fallback`                                                                                                                                          | [spec.md](avatar/spec.md)          |
| `@ndop/primitives/button`          | `NdButton`                                                                                                                                                                 | [spec.md](button/spec.md)          |
| `@ndop/primitives/checkbox`        | `NdCheckbox`, `…Indicator`                                                                                                                                                 | [spec.md](checkbox/spec.md)        |
| `@ndop/primitives/collapsible`     | `NdCollapsible`, `…Trigger`, `…Content`                                                                                                                                    | [spec.md](collapsible/spec.md)     |
| `@ndop/primitives/combobox`        | `NdCombobox`, `…Input`, `…Trigger`, `…Clear`, `…Content`, `…List`, `…Item`, `…ItemIndicator`, `…Empty`, `…Group`, `…Label`, `…Separator`, `…Chips`, `…Chip`, `…ChipRemove` | [spec.md](combobox/spec.md)        |
| `@ndop/primitives/command`         | `NdCommand`, `…Input`, `…List`, `…Item`, `…Empty`, `…Group`, `…GroupHeading`, `…Separator`                                                                                 | [spec.md](command/spec.md)         |
| `@ndop/primitives/context-menu`    | `NdContextMenuTrigger`                                                                                                                                                     | [spec.md](context-menu/spec.md)    |
| `@ndop/primitives/dialog`          | `NdDialog`, `…Trigger`, `…Portal`, `…Overlay`, `…Content`, `…Title`, `…Description`, `…Close`                                                                              | [spec.md](dialog/spec.md)          |
| `@ndop/primitives/drawer`          | `NdDrawer`, `…Trigger`, `…Portal`, `…Overlay`, `…Content`, `…Handle`, `…Title`, `…Description`, `…Close`                                                                   | [spec.md](drawer/spec.md)          |
| `@ndop/primitives/dropdown-menu`   | `NdDropdownMenuTrigger`                                                                                                                                                    | [spec.md](dropdown-menu/spec.md)   |
| `@ndop/primitives/form-field`      | `NdField`, `…Description`, `…Error`                                                                                                                                        | [spec.md](form-field/spec.md)      |
| `@ndop/primitives/hover-card`      | `NdHoverCard`, `…Trigger`, `…Portal`, `…Content`                                                                                                                           | [spec.md](hover-card/spec.md)      |
| `@ndop/primitives/input`           | `NdInput`, `NdControlRegistry`                                                                                                                                             | [spec.md](input/spec.md)           |
| `@ndop/primitives/input-otp`       | `NdInputOtp`, `…Input`, `…Group`, `…Slot`, `…Separator`                                                                                                                    | [spec.md](input-otp/spec.md)       |
| `@ndop/primitives/label`           | `NdLabel`                                                                                                                                                                  | [spec.md](label/spec.md)           |
| `@ndop/primitives/menu`            | `NdMenuContent`, `NdMenuItem`, `…ItemCheckbox`, `…RadioGroup`, `…ItemRadio`, `…ItemIndicator`, `…Group`, `…Label`, `…Separator`, `…SubTrigger`                             | [spec.md](menu/spec.md)            |
| `@ndop/primitives/menubar`         | `NdMenubar`, `…Trigger`                                                                                                                                                    | [spec.md](menubar/spec.md)         |
| `@ndop/primitives/navigation-menu` | `NdNavigationMenu`, `…List`, `…Item`, `…Trigger`, `…Content`, `…Link`                                                                                                      | [spec.md](navigation-menu/spec.md) |
| `@ndop/primitives/popover`         | `NdPopover`, `…Trigger`, `…Portal`, `…Content`, `…Close`                                                                                                                   | [spec.md](popover/spec.md)         |
| `@ndop/primitives/progress`        | `NdProgress`, `…Indicator`                                                                                                                                                 | [spec.md](progress/spec.md)        |
| `@ndop/primitives/radio-group`     | `NdRadioGroup`, `…Item`, `…Indicator`                                                                                                                                      | [spec.md](radio-group/spec.md)     |
| `@ndop/primitives/resizable`       | `NdResizablePanelGroup`, `NdResizablePanel`, `NdResizableHandle`                                                                                                           | [spec.md](resizable/spec.md)       |
| `@ndop/primitives/select`          | `NdSelect`, `…Trigger`, `…Value`, `…Content`, `…Item`, `…ItemText`, `…ItemIndicator`, `…Group`, `…Label`, `…Separator`                                                     | [spec.md](select/spec.md)          |
| `@ndop/primitives/separator`       | `NdSeparator`                                                                                                                                                              | [spec.md](separator/spec.md)       |
| `@ndop/primitives/slider`          | `NdSlider`, `…Track`, `…Range`, `…Thumb`                                                                                                                                   | [spec.md](slider/spec.md)          |
| `@ndop/primitives/switch`          | `NdSwitch`, `…Thumb`                                                                                                                                                       | [spec.md](switch/spec.md)          |
| `@ndop/primitives/tabs`            | `NdTabs`, `…List`, `…Trigger`, `…Content`                                                                                                                                  | [spec.md](tabs/spec.md)            |
| `@ndop/primitives/toast`           | `NdToaster`, `NdToasterOutlet`, `NdToastRegion`, `NdToast`, `…Title`, `…Description`, `…Action`, `…Close`                                                                  | [spec.md](toast/spec.md)           |
| `@ndop/primitives/toggle`          | `NdToggle`                                                                                                                                                                 | [spec.md](toggle/spec.md)          |
| `@ndop/primitives/toggle-group`    | `NdToggleGroup`, `…Item`                                                                                                                                                   | [spec.md](toggle-group/spec.md)    |
| `@ndop/primitives/tooltip`         | `NdTooltip`, `…Trigger`, `…Portal`, `…Content`                                                                                                                             | [spec.md](tooltip/spec.md)         |

`@ndop/primitives/internal` holds shared building blocks and is not public
API.

## Docs

https://ndop.dev
