import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
} from '@/ui/combobox/combobox';

/**
 * Several frameworks, chosen as chips. Picking an option toggles it and
 * keeps the list open; Backspace in the empty field removes the last chip.
 */
@Component({
  selector: 'example-combobox-multiple',
  imports: [
    Combobox,
    ComboboxChip,
    ComboboxChipRemove,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxList,
    NdIcon,
  ],
  template: `
    <ng-container ndCombobox multiple [(values)]="chosen">
      <div ndComboboxChips class="w-xs max-w-full">
        @for (value of chosen(); track value) {
          <span ndComboboxChip [value]="value">
            {{ labelOf(value) }}
            <button ndComboboxChipRemove><svg ndIcon="x"></svg></button>
          </span>
        }
        <input
          ndComboboxChipsInput
          aria-label="Frameworks"
          placeholder="Add framework"
        />
      </div>
      <div ndComboboxContent>
        <div ndComboboxList>
          <div ndComboboxEmpty>No framework found.</div>
          @for (option of frameworks; track option.value) {
            <div ndComboboxItem [value]="option.value">
              {{ option.label }}
              <span ndComboboxItemIndicator><svg ndIcon="check"></svg></span>
            </div>
          }
        </div>
      </div>
    </ng-container>
  `,
})
export class ComboboxMultipleExample {
  protected readonly chosen = signal<readonly string[]>(['angular']);
  protected readonly frameworks = [
    { value: 'angular', label: 'Angular' },
    { value: 'analog', label: 'Analog' },
    { value: 'astro', label: 'Astro' },
    { value: 'nuxt', label: 'Nuxt' },
    { value: 'remix', label: 'Remix' },
    { value: 'sveltekit', label: 'SvelteKit' },
  ];

  /**
   * The label of a chosen framework, for its chip.
   *
   * @param value - The framework's value.
   * @returns Its label.
   */
  protected labelOf(value: string): string {
    return (
      this.frameworks.find((option) => option.value === value)?.label ?? value
    );
  }
}
