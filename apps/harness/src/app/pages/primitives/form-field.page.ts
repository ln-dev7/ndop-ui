import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import {
  NdField,
  NdFieldDescription,
  NdFieldError,
} from '@ndop/primitives/form-field';
import { NdInput } from '@ndop/primitives/input';
import { NdLabel } from '@ndop/primitives/label';

/**
 * Form Field demo (`/primitives/form-field`): an email field whose error
 * appears once it's invalid and touched.
 */
@Component({
  selector: 'harness-form-field-demo',
  imports: [
    NdField,
    NdFieldDescription,
    NdFieldError,
    NdInput,
    NdLabel,
    FormField,
  ],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Form Field</h1>
      <div ndField class="grid gap-1 data-invalid:text-destructive">
        <label ndLabel for="email">Email</label>
        <input
          ndInput
          id="email"
          type="email"
          [formField]="account.email"
          class="rounded-md border border-foreground px-3 py-2 text-foreground"
        />
        <p ndFieldDescription class="text-foreground">We never share it.</p>
        <div ndFieldError>
          @for (error of account.email().errors(); track error.kind) {
            <p>{{ error.message }}</p>
          }
        </div>
      </div>
    </main>
  `,
})
export default class FormFieldDemo {
  protected readonly model = signal({ email: '' });
  protected readonly account = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email.' });
    email(path.email, { message: 'Enter a valid email address.' });
  });
}
