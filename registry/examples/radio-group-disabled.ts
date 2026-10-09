import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Label } from '@/ui/label/label';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';

/**
 * A group with one option that can't be chosen; the arrow keys skip it.
 */
@Component({
  selector: 'example-radio-group-disabled',
  imports: [Label, NdIcon, RadioGroup, RadioGroupIndicator, RadioGroupItem],
  template: `
    <div ndRadioGroup aria-label="Delivery" defaultValue="standard">
      @for (option of options; track option.value) {
        <div class="flex items-center gap-3">
          <button
            ndRadioGroupItem
            [value]="option.value"
            [id]="'radio-group-disabled-' + option.value"
            [disabled]="option.disabled"
          >
            <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
          </button>
          <label
            ndLabel
            [for]="'radio-group-disabled-' + option.value"
            class="data-disabled:opacity-50"
          >
            {{ option.label }}
          </label>
        </div>
      }
    </div>
  `,
})
export class RadioGroupDisabledExample {
  protected readonly options = [
    { value: 'standard', label: 'Standard, 3–5 days', disabled: false },
    { value: 'express', label: 'Express, next day', disabled: false },
    { value: 'same-day', label: 'Same day (unavailable)', disabled: true },
  ];
}
