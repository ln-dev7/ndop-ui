import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/ui/form-field/form-field';
import { Label } from '@/ui/label/label';

/** A checkbox with its label, and one with a description beside it. */
@Component({
  selector: 'example-checkbox-demo',
  imports: [
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    Label,
    NdIcon,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-3">
        <button ndCheckbox id="checkbox-demo-terms">
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <label ndLabel for="checkbox-demo-terms">
          Accept terms and conditions
        </label>
      </div>
      <div ndField orientation="horizontal">
        <button ndCheckbox id="checkbox-demo-notify" [defaultChecked]="true">
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <div ndFieldContent>
          <label ndFieldLabel for="checkbox-demo-notify">
            Enable notifications
          </label>
          <p ndFieldDescription>
            You can enable or disable notifications at any time.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class CheckboxDemoExample {}
