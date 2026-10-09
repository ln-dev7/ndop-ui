import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Field,
  FieldError,
  FieldLegend,
  FieldSet,
} from '@/ui/form-field/form-field';
import { Label } from '@/ui/label/label';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';

/**
 * A required choice in a Signal Forms form. Submitting without one shows
 * the error and announces it.
 */
@Component({
  selector: 'example-radio-group-form',
  imports: [
    Button,
    Field,
    FieldError,
    FieldLegend,
    FieldSet,
    FormField,
    Label,
    NdIcon,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
  ],
  template: `
    <form class="flex flex-col gap-6" (submit)="submit($event)">
      <fieldset ndFieldSet>
        <legend ndFieldLegend variant="label" id="radio-group-form-legend">
          Notify me about
        </legend>
        <div ndField>
          <div
            ndRadioGroup
            aria-labelledby="radio-group-form-legend"
            [formField]="preferences.notify"
          >
            @for (option of options; track option.value) {
              <div class="flex items-center gap-3">
                <button
                  ndRadioGroupItem
                  [value]="option.value"
                  [id]="'radio-group-form-' + option.value"
                >
                  <span ndRadioGroupIndicator>
                    <svg ndIcon="circle"></svg>
                  </span>
                </button>
                <label ndLabel [for]="'radio-group-form-' + option.value">
                  {{ option.label }}
                </label>
              </div>
            }
          </div>
          <p ndFieldError>Choose what to be notified about.</p>
        </div>
      </fieldset>
      <button ndButton type="submit" class="self-start">Save</button>
    </form>
  `,
})
export class RadioGroupFormExample {
  protected readonly options = [
    { value: 'all', label: 'All new messages' },
    { value: 'mentions', label: 'Direct messages and mentions' },
    { value: 'none', label: 'Nothing' },
  ];

  protected readonly model = signal<{ notify: string | null }>({
    notify: null,
  });

  protected readonly preferences = form(this.model, (path) => {
    required(path.notify);
  });

  /**
   * Marks the fields touched, so errors show, instead of reloading.
   *
   * @param event - The form's submit event.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.preferences().markAsTouched();
  }
}
