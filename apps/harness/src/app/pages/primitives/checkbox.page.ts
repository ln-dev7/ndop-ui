import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NdCheckbox, NdCheckboxIndicator } from '@ndop/primitives/checkbox';
import {
  NdField,
  NdFieldDescription,
  NdFieldError,
} from '@ndop/primitives/form-field';
import { NdLabel } from '@ndop/primitives/label';

/**
 * Checkbox demo (`/primitives/checkbox`): an unchecked checkbox, a mixed
 * one, a disabled one, and a required Signal Forms field inside a form
 * field.
 */
@Component({
  selector: 'harness-checkbox-demo',
  imports: [
    NdCheckbox,
    NdCheckboxIndicator,
    NdLabel,
    NdField,
    NdFieldDescription,
    NdFieldError,
    FormField,
  ],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Checkbox</h1>
      <div class="flex items-center gap-2">
        <button
          ndCheckbox
          id="newsletter"
          [(checked)]="newsletter"
          [class]="box"
        >
          <span ndCheckboxIndicator>✓</span>
        </button>
        <label ndLabel for="newsletter">Newsletter</label>
      </div>
      <p>Newsletter: {{ newsletter() ? 'yes' : 'no' }}</p>
      <div class="flex items-center gap-2">
        <button ndCheckbox id="all" [indeterminate]="true" [class]="box">
          <span ndCheckboxIndicator>–</span>
        </button>
        <label ndLabel for="all">Select all</label>
      </div>
      <div class="flex items-center gap-2">
        <button ndCheckbox id="locked" defaultChecked disabled [class]="box">
          <span ndCheckboxIndicator>✓</span>
        </button>
        <label ndLabel for="locked" class="data-disabled:opacity-50"
          >Locked</label
        >
      </div>
      <div ndField class="grid gap-1">
        <div class="flex items-center gap-2">
          <button
            ndCheckbox
            id="terms"
            [formField]="terms.accepted"
            [class]="box"
          >
            <span ndCheckboxIndicator>✓</span>
          </button>
          <label ndLabel for="terms">Accept the terms</label>
        </div>
        <p ndFieldDescription>Required to create an account.</p>
        <p ndFieldError class="text-destructive">
          Accept the terms to continue.
        </p>
      </div>
    </main>
  `,
})
export default class CheckboxDemo {
  protected readonly box =
    'size-5 rounded border border-foreground text-xs leading-none data-invalid:border-destructive';
  protected readonly newsletter = signal(false);
  protected readonly model = signal({ accepted: false });
  protected readonly terms = form(this.model, (path) => {
    required(path.accepted);
  });
}
