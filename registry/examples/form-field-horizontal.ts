import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/ui/form-field/form-field';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/**
 * Checkbox and switch fields with their labels and descriptions beside
 * the control, which each control's description lists.
 */
@Component({
  selector: 'example-form-field-horizontal',
  imports: [
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    NdIcon,
    Switch,
    SwitchThumb,
  ],
  template: `
    <div ndFieldGroup class="w-full max-w-md">
      <div ndField orientation="horizontal">
        <button
          ndCheckbox
          id="form-field-horizontal-sync"
          [defaultChecked]="true"
        >
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <div ndFieldContent>
          <label ndFieldLabel for="form-field-horizontal-sync">
            Sync across devices
          </label>
          <p ndFieldDescription>
            Your settings follow you to every device you sign in on.
          </p>
        </div>
      </div>
      <div ndField orientation="horizontal">
        <div ndFieldContent>
          <label ndFieldLabel for="form-field-horizontal-2fa">
            Two-factor authentication
          </label>
          <p ndFieldDescription>
            Ask for a code from your phone when you sign in.
          </p>
        </div>
        <button ndSwitch id="form-field-horizontal-2fa">
          <span ndSwitchThumb></span>
        </button>
      </div>
    </div>
  `,
})
export class FormFieldHorizontalExample {}
