import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
} from '@/ui/combobox/combobox';
import {
  NdCombobox as Combobox,
  NdComboboxGroup as ComboboxGroup,
} from '@ndop/primitives/combobox';

/**
 * Options in labelled groups, with separators. A group hides while none
 * of its options matches.
 */
@Component({
  selector: 'example-combobox-groups',
  imports: [
    Combobox,
    ComboboxContent,
    ComboboxControl,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxLabel,
    ComboboxList,
    ComboboxSeparator,
    ComboboxTrigger,
    NdIcon,
  ],
  template: `
    <ng-container ndCombobox>
      <div ndComboboxControl class="w-[240px]">
        <input ndComboboxInput aria-label="Food" placeholder="Select a food" />
        <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
      </div>
      <div ndComboboxContent>
        <div ndComboboxList>
          <div ndComboboxEmpty>No food found.</div>
          @for (group of groups; track group.name; let last = $last) {
            <div ndComboboxGroup>
              <div ndComboboxLabel>{{ group.name }}</div>
              @for (food of group.foods; track food) {
                <div ndComboboxItem [value]="food">
                  {{ food }}
                  <span ndComboboxItemIndicator>
                    <svg ndIcon="check"></svg>
                  </span>
                </div>
              }
            </div>
            @if (!last) {
              <div ndComboboxSeparator></div>
            }
          }
        </div>
      </div>
    </ng-container>
  `,
})
export class ComboboxGroupsExample {
  protected readonly groups = [
    { name: 'Fruits', foods: ['Apple', 'Banana', 'Mango'] },
    { name: 'Vegetables', foods: ['Carrot', 'Okra', 'Spinach'] },
    { name: 'Grains', foods: ['Millet', 'Rice', 'Sorghum'] },
  ];
}
