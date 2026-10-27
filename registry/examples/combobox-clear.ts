import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ComboboxClear,
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from '@/ui/combobox/combobox';
import { NdCombobox as Combobox } from '@ndop/primitives/combobox';

/**
 * A combobox with a button that clears it, shown in place of the chevron
 * once there is something to clear. Escape clears it from the keyboard.
 */
@Component({
  selector: 'example-combobox-clear',
  imports: [
    Combobox,
    ComboboxClear,
    ComboboxContent,
    ComboboxControl,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxList,
    ComboboxTrigger,
    NdIcon,
  ],
  template: `
    <ng-container ndCombobox [(value)]="country">
      <div ndComboboxControl class="w-[240px]">
        <input
          ndComboboxInput
          aria-label="Country"
          placeholder="Select a country"
        />
        <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
        <button ndComboboxClear><svg ndIcon="x"></svg></button>
      </div>
      <div ndComboboxContent>
        <div ndComboboxList>
          <div ndComboboxEmpty>No country found.</div>
          @for (name of countries; track name) {
            <div ndComboboxItem [value]="name">
              {{ name }}
              <span ndComboboxItemIndicator><svg ndIcon="check"></svg></span>
            </div>
          }
        </div>
      </div>
    </ng-container>
  `,
})
export class ComboboxClearExample {
  protected readonly country = signal<string | null>('Cameroon');
  protected readonly countries = [
    'Brazil',
    'Cameroon',
    'Canada',
    'France',
    'Japan',
    'Nigeria',
  ];
}
