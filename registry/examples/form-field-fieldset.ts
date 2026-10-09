import { Component } from '@angular/core';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';

/**
 * An address in a field set with a legend. The responsive fields put
 * their label beside the input when the group is wide enough.
 */
@Component({
  selector: 'example-form-field-fieldset',
  imports: [
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    Input,
  ],
  template: `
    <fieldset ndFieldSet class="w-full max-w-lg">
      <legend ndFieldLegend>Shipping address</legend>
      <p ndFieldDescription>Where should we send your order?</p>
      <div ndFieldGroup>
        <div ndField orientation="responsive">
          <label ndFieldLabel for="form-field-fieldset-street">Street</label>
          <input
            ndInput
            id="form-field-fieldset-street"
            autocomplete="street-address"
          />
        </div>
        <div ndField orientation="responsive">
          <label ndFieldLabel for="form-field-fieldset-city">City</label>
          <input
            ndInput
            id="form-field-fieldset-city"
            autocomplete="address-level2"
          />
        </div>
        <div ndField orientation="responsive">
          <label ndFieldLabel for="form-field-fieldset-postcode">
            Postal code
          </label>
          <input
            ndInput
            id="form-field-fieldset-postcode"
            autocomplete="postal-code"
          />
        </div>
      </div>
    </fieldset>
  `,
})
export class FormFieldFieldsetExample {}
