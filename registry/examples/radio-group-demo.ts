import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Label } from '@/ui/label/label';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';

/** Three options with labels, one chosen by default. */
@Component({
  selector: 'example-radio-group-demo',
  imports: [Label, NdIcon, RadioGroup, RadioGroupIndicator, RadioGroupItem],
  template: `
    <div ndRadioGroup aria-label="Density" defaultValue="comfortable">
      @for (option of options; track option.value) {
        <div class="flex items-center gap-3">
          <button
            ndRadioGroupItem
            [value]="option.value"
            [id]="'radio-group-demo-' + option.value"
          >
            <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
          </button>
          <label ndLabel [for]="'radio-group-demo-' + option.value">
            {{ option.label }}
          </label>
        </div>
      }
    </div>
  `,
})
export class RadioGroupDemoExample {
  protected readonly options = [
    { value: 'default', label: 'Default' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact' },
  ];
}
