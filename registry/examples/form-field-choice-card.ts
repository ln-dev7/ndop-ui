import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/ui/form-field/form-field';

/**
 * Add-ons as cards: each whole field is the label of its checkbox, and a
 * checked card is highlighted.
 */
@Component({
  selector: 'example-form-field-choice-card',
  imports: [
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
    NdIcon,
  ],
  template: `
    <fieldset ndFieldSet class="w-full max-w-sm">
      <legend ndFieldLegend variant="label">Add-ons</legend>
      @for (addOn of addOns; track addOn.id) {
        <label ndFieldLabel [for]="'form-field-choice-card-' + addOn.id">
          <div ndField orientation="horizontal">
            <button
              ndCheckbox
              [id]="'form-field-choice-card-' + addOn.id"
              [attr.aria-label]="addOn.title"
              [defaultChecked]="addOn.checked"
            >
              <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
            </button>
            <div ndFieldContent>
              <div ndFieldTitle>{{ addOn.title }}</div>
              <p ndFieldDescription>{{ addOn.description }}</p>
            </div>
          </div>
        </label>
      }
    </fieldset>
  `,
})
export class FormFieldChoiceCardExample {
  protected readonly addOns = [
    {
      id: 'backups',
      title: 'Daily backups',
      description: 'Restore any day from the last 30.',
      checked: true,
    },
    {
      id: 'domain',
      title: 'Custom domain',
      description: 'Serve your site from your own address.',
      checked: false,
    },
  ];
}
