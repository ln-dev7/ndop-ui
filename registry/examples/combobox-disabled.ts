import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/ui/combobox/combobox';
import { NdCombobox as Combobox } from '@ndop/primitives/combobox';

/**
 * A disabled combobox, and one with a disabled option, which the arrow
 * keys skip.
 */
@Component({
  selector: 'example-combobox-disabled',
  imports: [
    Combobox,
    ComboboxContent,
    ComboboxControl,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
    NdIcon,
  ],
  template: `
    <div class="flex flex-wrap items-center gap-4">
      <ng-container ndCombobox disabled>
        <div ndComboboxControl class="w-[200px]">
          <input
            ndComboboxInput
            aria-label="Team"
            placeholder="Select a team"
          />
          <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
        </div>
        <div ndComboboxContent>
          <div ndComboboxList>
            <div ndComboboxEmpty>No team found.</div>
            <div ndComboboxItem value="design">Design</div>
          </div>
        </div>
      </ng-container>
      <ng-container ndCombobox>
        <div ndComboboxControl class="w-[200px]">
          <input
            ndComboboxInput
            aria-label="Region"
            placeholder="Select a region"
          />
          <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
        </div>
        <div ndComboboxContent>
          <div ndComboboxList>
            <div ndComboboxEmpty>No region found.</div>
            <div ndComboboxItem value="africa">Africa</div>
            <div ndComboboxItem value="europe">Europe</div>
            <div ndComboboxItem value="antarctica" disabled>
              Antarctica (unavailable)
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class ComboboxDisabledExample {}
