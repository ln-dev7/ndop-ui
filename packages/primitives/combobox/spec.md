# Combobox: accessibility contract

Written before any code, as RFC-0001 requires ("Accessibility contract per
primitive"). Tests are checked against this file, and the docs keyboard table
is rendered from it.

## WAI-ARIA pattern

[Editable combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/):
a text field that filters a popup listbox. Focus stays in the field and
`aria-activedescendant` points at the highlighted option, on the CDK's
`ActiveDescendantKeyManager`, with the popup in a CDK overlay (ADR-0004,
amendment 3). With `multiple`, the chosen options show as chips beside the
field and the listbox is `aria-multiselectable`.

## Markup

The popup is written in place, after the field. It has the `hidden`
attribute while closed, so its options render on the server and the field
can show the selected option's text; opening moves it into an overlay
below the field (or the chips), and closing puts it back.

```html
<label ndLabel for="framework">Framework</label>
<ng-container ndCombobox [(value)]="framework">
  <input ndComboboxInput id="framework" placeholder="Select a framework" />
  <button ndComboboxTrigger>⌄</button>
  <div ndComboboxContent>
    <div ndComboboxList>
      <div ndComboboxEmpty>No framework found.</div>
      <div ndComboboxItem value="angular">Angular <span ndComboboxItemIndicator>✓</span></div>
      <div ndComboboxItem value="vue">Vue</div>
    </div>
  </div>
</ng-container>

<ng-container ndCombobox multiple [(values)]="frameworks">
  <div ndComboboxChips>
    @for (value of frameworks; track value) {
    <span ndComboboxChip [value]="value"> {{ value }} <button ndComboboxChipRemove>×</button> </span>
    }
    <input ndComboboxInput aria-label="Frameworks" />
  </div>
  <div ndComboboxContent>…</div>
</ng-container>
```

## Parts, roles and attributes

| Part                  | Selector                       | Role       | ARIA attributes                                                                                                                     | Data attributes                                      |
| --------------------- | ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Combobox              | `[ndCombobox]`                 |            |                                                                                                                                     |                                                      |
| ComboboxInput         | `input[ndComboboxInput]`       | `combobox` | `aria-autocomplete`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-required`, `aria-invalid`, `aria-describedby` | `data-state`, `data-disabled`, `data-invalid`        |
| ComboboxTrigger       | `button[ndComboboxTrigger]`    |            | `aria-hidden`, `tabindex`                                                                                                           | `data-state`                                         |
| ComboboxClear         | `button[ndComboboxClear]`      |            | `aria-hidden`, `tabindex`, `hidden`                                                                                                 |                                                      |
| ComboboxContent       | `[ndComboboxContent]`          |            | `hidden`                                                                                                                            | `data-state`, `data-side`, `data-empty`              |
| ComboboxList          | `[ndComboboxList]`             | `listbox`  | `aria-labelledby` or `aria-label`, `aria-multiselectable`, `id`                                                                     | `data-empty`                                         |
| ComboboxItem          | `[ndComboboxItem]`             | `option`   | `aria-selected`, `aria-disabled`, `id`, `hidden`                                                                                    | `data-highlighted`, `data-selected`, `data-disabled` |
| ComboboxItemIndicator | `[ndComboboxItemIndicator]`    |            | `hidden`                                                                                                                            |                                                      |
| ComboboxEmpty         | `[ndComboboxEmpty]`            |            | `hidden`                                                                                                                            |                                                      |
| ComboboxGroup         | `[ndComboboxGroup]`            | `group`    | `aria-labelledby`, `hidden`                                                                                                         |                                                      |
| ComboboxLabel         | `[ndComboboxLabel]`            |            | `id`                                                                                                                                |                                                      |
| ComboboxSeparator     | `[ndComboboxSeparator]`        |            | `aria-hidden`                                                                                                                       |                                                      |
| ComboboxChips         | `[ndComboboxChips]`            |            |                                                                                                                                     |                                                      |
| ComboboxChip          | `[ndComboboxChip]`             |            |                                                                                                                                     | `data-disabled`                                      |
| ComboboxChipRemove    | `button[ndComboboxChipRemove]` |            | `aria-hidden`, `tabindex`                                                                                                           |                                                      |

- **Combobox** goes on an `ng-container`. Without `multiple`, `value` is a
  `model()` holding the chosen option's value, or `null`; with it,
  `values` is a `model()` listing the chosen values. `search` is a
  `model()` holding the field's text, and `open` is a `model()` too. Items
  whose text doesn't contain every word typed (ignoring case and accents)
  are hidden; `filter` replaces that test, and `null` shows every item,
  for lists filtered elsewhere. `autoHighlight` highlights the first shown
  option as the user types. `disabled`, `required` and `invalid` set the
  field's state.
- **ComboboxInput** is the text field. Name it with a `label[ndLabel]`
  whose `for` is its `id`, or with `aria-label`. The combobox owns its
  value, so the field is a `ControlValueAccessor` that Signal Forms
  (`[formField]`), reactive and template-driven forms bind (ADR-0004,
  amendments 1 and 4); its value is `value`, or `values` with `multiple`.
  It joins a Form Field's description and error. Without `multiple`, it
  shows the chosen option's text; when focus leaves the combobox, an empty
  field clears the value and any other text goes back to the chosen
  option's.
- **ComboboxTrigger** and **ComboboxClear** are pointer shortcuts for what
  the keyboard does from the field (`Alt+ArrowDown`, `Escape`), so they're
  out of the tab order and hidden from assistive technology. The trigger
  toggles the popup; the clear button empties the field and the value, and
  has the `hidden` attribute while there is nothing to clear.
- **ComboboxContent** is the popup. While open, it sits below the chips, or
  else the field (`side`, default `bottom`; `align`, default `start`;
  `sideOffset`, default `6`), at least as wide, and flips to fit the
  viewport. The anchor's width is in `--nd-combobox-anchor-width`.
  `data-empty` marks it while no option is shown.
- **ComboboxList** is the `listbox`, named after the field's labels unless
  it has its own `aria-label`.
- **ComboboxItem** has a required `value`, a `disabled` input and an
  optional `label` (default: its text). The highlighted option has
  `data-highlighted`; without `multiple` it also has
  `aria-selected="true"`, as the APG pattern does, and with `multiple`
  `aria-selected` marks the chosen options. `data-selected` marks chosen
  options either way. The pointer moving over an option highlights it.
- **ComboboxItemIndicator** has the `hidden` attribute unless its option is
  chosen. **ComboboxEmpty** shows only while no option is.
- **ComboboxGroup** has `role="group"`, named by its **ComboboxLabel**,
  and is hidden while none of its options is shown. **ComboboxSeparator**
  is decorative.
- **ComboboxChips** holds the chips and the field; clicking its empty
  space focuses the field. **ComboboxChip** shows one chosen value; its
  **ComboboxChipRemove** removes it with the pointer, as `Backspace` does
  from the field.
- The popup is never shown on the server.

## Keyboard map

| Key             | Action                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `a`             | Types into the field, opening the popup and filtering its options.                                                  |
| `ArrowDown`     | Opens the popup and highlights the chosen option or the first; while open, highlights the next option.              |
| `ArrowUp`       | Opens the popup and highlights the last option; while open, highlights the previous option.                         |
| `Alt+ArrowDown` | Opens the popup without highlighting an option.                                                                     |
| `Enter`         | Chooses the highlighted option. Without `multiple` the popup closes; with it, the option toggles and it stays open. |
| `Escape`        | Closes the popup; if it's closed, clears the field and, without `multiple`, the value.                              |
| `Backspace`     | With `multiple`, in an empty field, removes the last chosen value.                                                  |
| `Home`, `End`   | Move the caret in the field, as in any text field.                                                                  |
| `Tab`           | Closes the popup and moves focus on.                                                                                |

## Focus behavior

- Focus stays in the field; `aria-activedescendant` points at the
  highlighted option, which scrolls into view.
- Clicking an option, the trigger, the clear button or a chip's remove
  button keeps focus in the field.
- Focus leaving the combobox closes the popup and marks a bound field
  touched.

## RTL behavior

`start` and `end` alignments are logical and swap in right-to-left
layouts. The listbox is vertical, so its arrow keys don't change.
