import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import { Label } from '@/ui/label/label';

/** A disabled checkbox, checked and unchecked, with dimmed labels. */
@Component({
  selector: 'example-checkbox-disabled',
  imports: [Checkbox, CheckboxIndicator, Label, NdIcon],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <button ndCheckbox id="checkbox-disabled-off" disabled>
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <label ndLabel for="checkbox-disabled-off">Sync contacts</label>
      </div>
      <div class="flex items-center gap-3">
        <button
          ndCheckbox
          id="checkbox-disabled-on"
          disabled
          [defaultChecked]="true"
        >
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <label ndLabel for="checkbox-disabled-on">Required by your plan</label>
      </div>
    </div>
  `,
})
export class CheckboxDisabledExample {}
