import { Component, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/ui/form-field/form-field';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/**
 * Email settings as switches bound to a Signal Forms model, each saved as
 * soon as it changes; security emails can't be turned off.
 */
@Component({
  selector: 'example-switch-form',
  imports: [
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FormField,
    Switch,
    SwitchThumb,
  ],
  template: `
    <fieldset ndFieldSet class="w-full max-w-md">
      <legend ndFieldLegend>Email notifications</legend>
      <div ndFieldGroup>
        <div ndField orientation="horizontal" class="rounded-lg border p-4">
          <div ndFieldContent>
            <label ndFieldLabel for="switch-form-marketing">
              Marketing emails
            </label>
            <p ndFieldDescription>
              Receive emails about new products, features and more.
            </p>
          </div>
          <button
            ndSwitch
            id="switch-form-marketing"
            [formField]="settings.marketing"
          >
            <span ndSwitchThumb></span>
          </button>
        </div>
        <div ndField orientation="horizontal" class="rounded-lg border p-4">
          <div ndFieldContent>
            <label ndFieldLabel for="switch-form-security">
              Security emails
            </label>
            <p ndFieldDescription>
              Receive emails about your account security.
            </p>
          </div>
          <button
            ndSwitch
            id="switch-form-security"
            [formField]="settings.security"
          >
            <span ndSwitchThumb></span>
          </button>
        </div>
      </div>
    </fieldset>
  `,
})
export class SwitchFormExample {
  protected readonly model = signal({ marketing: false, security: true });

  protected readonly settings = form(this.model, (path) => {
    disabled(path.security);
  });
}
