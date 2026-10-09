import { Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { Button } from '@/ui/button/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSeparatorContent,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';

/**
 * A sign-up form in Signal Forms. Each field's input is described by its
 * help text and, once it's invalid and has been left, by its errors, which
 * appear and are announced then.
 */
@Component({
  selector: 'example-form-field-demo',
  imports: [
    Button,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
    FieldSeparatorContent,
    FormField,
    Input,
  ],
  template: `
    <form class="w-full max-w-sm" (submit)="submit($event)">
      <div ndFieldGroup>
        <div ndField>
          <label ndFieldLabel for="form-field-demo-email">Email</label>
          <input
            ndInput
            id="form-field-demo-email"
            type="email"
            autocomplete="email"
            [formField]="signup.email"
          />
          <p ndFieldDescription>We'll never share your email.</p>
          <div ndFieldError>
            @for (error of signup.email().errors(); track error.kind) {
              <p>{{ error.message }}</p>
            }
          </div>
        </div>
        <div ndField>
          <label ndFieldLabel for="form-field-demo-password">Password</label>
          <input
            ndInput
            id="form-field-demo-password"
            type="password"
            autocomplete="new-password"
            [formField]="signup.password"
          />
          <p ndFieldDescription>At least 12 characters.</p>
          <div ndFieldError>
            @for (error of signup.password().errors(); track error.kind) {
              <p>{{ error.message }}</p>
            }
          </div>
        </div>
        <button ndButton type="submit">Create account</button>
        <div ndFieldSeparator>
          <span ndFieldSeparatorContent>Or</span>
        </div>
        <button ndButton type="button" variant="outline">
          Continue with a passkey
        </button>
      </div>
    </form>
  `,
})
export class FormFieldDemoExample {
  protected readonly model = signal({ email: '', password: '' });

  protected readonly signup = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email.' });
    email(path.email, { message: 'Enter an email like ada@example.com.' });
    required(path.password, { message: 'Choose a password.' });
    minLength(path.password, 12, {
      message: 'Use at least 12 characters.',
    });
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
