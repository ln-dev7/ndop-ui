import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/ui/form-field/form-field';

/**
 * A terms checkbox that must be checked to continue, in a Signal Forms
 * form: its error shows once the box has been left unchecked, or the form
 * was submitted.
 */
@Component({
  selector: 'example-checkbox-form',
  imports: [
    Button,
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
    FormField,
    NdIcon,
  ],
  template: `
    <form class="flex max-w-sm flex-col gap-6" (submit)="submit($event)">
      <div ndField orientation="horizontal">
        <button ndCheckbox id="checkbox-form-terms" [formField]="signup.terms">
          <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
        </button>
        <div ndFieldContent>
          <label ndFieldLabel for="checkbox-form-terms">
            I agree to the terms of service
          </label>
          <p ndFieldDescription>Read them before you sign up.</p>
          <p ndFieldError>Agree to the terms to create your account.</p>
        </div>
      </div>
      <button ndButton type="submit" class="self-start">Create account</button>
    </form>
  `,
})
export class CheckboxFormExample {
  protected readonly model = signal({ terms: false });

  protected readonly signup = form(this.model, (path) => {
    required(path.terms);
  });

  /**
   * Marks the fields touched, so errors show, instead of reloading.
   *
   * @param event - The form's submit event.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.signup().markAsTouched();
  }
}
