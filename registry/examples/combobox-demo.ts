import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from '@/ui/combobox/combobox';
import { Label } from '@/ui/label/label';
import { NdCombobox as Combobox } from '@ndop/primitives/combobox';

/**
 * A framework picker that filters as you type. Focus stays in the field;
 * the arrow keys move through the options and Enter picks one.
 */
@Component({
  selector: 'example-combobox-demo',
  imports: [
    Combobox,
    ComboboxContent,
    ComboboxControl,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxList,
    ComboboxTrigger,
    Label,
    NdIcon,
  ],
  template: `
    <div class="grid w-[240px] gap-3">
      <label ndLabel for="combobox-demo-framework">Framework</label>
      <ng-container ndCombobox [(value)]="framework">
        <div ndComboboxControl>
          <input
            ndComboboxInput
            id="combobox-demo-framework"
            placeholder="Select a framework"
          />
          <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
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
    </div>
  `,
})
export class ComboboxDemoExample {
  protected readonly framework = signal<string | null>(null);
  protected readonly frameworks = [
    { value: 'angular', label: 'Angular' },
    { value: 'analog', label: 'Analog' },
    { value: 'astro', label: 'Astro' },
    { value: 'nuxt', label: 'Nuxt' },
    { value: 'remix', label: 'Remix' },
    { value: 'sveltekit', label: 'SvelteKit' },
  ];
}
