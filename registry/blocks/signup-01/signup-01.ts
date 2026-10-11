import { Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert/alert';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';

/**
 * A sign-up page: a centered card with a Signal Forms form for name,
 * email, password, its confirmation and the terms. Errors show once a
 * field has been left, or the form submitted; a valid submit swaps the
 * form for a success message instead of navigating.
 */
@Component({
  selector: 'block-signup-01',
  imports: [
    Alert,
    AlertDescription,
    AlertTitle,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FormField,
    Input,
    NdIcon,
  ],
  template: `
    <main
      class="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10"
    >
      <section
        ndCard
        class="w-full max-w-sm"
        aria-labelledby="signup-01-title"
        aria-describedby="signup-01-description"
      >
        <div ndCardHeader>
          <h1 ndCardTitle id="signup-01-title" class="text-xl">
            Create an account
          </h1>
          <p ndCardDescription id="signup-01-description">
            Enter your details below to create your account.
          </p>
        </div>
        <div ndCardContent>
          @if (created()) {
            <div ndAlert role="status">
              <svg ndIcon="circle-check"></svg>
              <h2 ndAlertTitle>Your account is ready</h2>
              <p ndAlertDescription>
                We sent a confirmation link to {{ model().email }}.
              </p>
            </div>
          } @else {
            <form novalidate (submit)="submit($event)">
              <div ndFieldGroup>
                <div ndField>
                  <label ndFieldLabel for="signup-01-name">Name</label>
                  <input
                    ndInput
                    id="signup-01-name"
                    type="text"
                    autocomplete="name"
                    placeholder="Ada Lovelace"
                    [formField]="signup.name"
                  />
                  <div ndFieldError>
                    @for (error of signup.name().errors(); track error.kind) {
                      <p>{{ error.message }}</p>
                    }
                  </div>
                </div>
                <div ndField>
                  <label ndFieldLabel for="signup-01-email">Email</label>
                  <input
                    ndInput
                    id="signup-01-email"
                    type="email"
                    autocomplete="email"
                    placeholder="ada@example.com"
                    [formField]="signup.email"
                  />
                  <div ndFieldError>
                    @for (error of signup.email().errors(); track error.kind) {
                      <p>{{ error.message }}</p>
                    }
                  </div>
                </div>
                <div ndField>
                  <label ndFieldLabel for="signup-01-password">Password</label>
                  <input
                    ndInput
                    id="signup-01-password"
                    type="password"
                    autocomplete="new-password"
                    [formField]="signup.password"
                  />
                  <p ndFieldDescription>At least 12 characters.</p>
                  <div ndFieldError>
                    @for (
                      error of signup.password().errors();
                      track error.kind
                    ) {
                      <p>{{ error.message }}</p>
                    }
                  </div>
                </div>
                <div ndField>
                  <label ndFieldLabel for="signup-01-confirm-password">
                    Confirm password
                  </label>
                  <input
                    ndInput
                    id="signup-01-confirm-password"
                    type="password"
                    autocomplete="new-password"
                    [formField]="signup.confirmPassword"
                  />
                  <div ndFieldError>
                    @for (
                      error of signup.confirmPassword().errors();
                      track error.kind
                    ) {
                      <p>{{ error.message }}</p>
                    }
                  </div>
                </div>
                <div ndField orientation="horizontal">
                  <button
                    ndCheckbox
                    id="signup-01-terms"
                    [formField]="signup.terms"
                  >
                    <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
                  </button>
                  <div ndFieldContent>
                    <label ndFieldLabel for="signup-01-terms">
                      I agree to the terms of service
                    </label>
                    <p ndFieldDescription>
                      Read the <a href="/terms">terms</a> and the
                      <a href="/privacy">privacy policy</a>.
                    </p>
                    <div ndFieldError>
                      @for (
                        error of signup.terms().errors();
                        track error.kind
                      ) {
                        <p>{{ error.message }}</p>
                      }
                    </div>
                  </div>
                </div>
                <div ndField>
                  <button ndButton type="submit">Create account</button>
                  <p ndFieldDescription class="text-center">
                    Already have an account? <a href="/login">Sign in</a>
                  </p>
                </div>
              </div>
            </form>
          }
        </div>
      </section>
    </main>
  `,
})
export class Signup01Block {
  protected readonly model = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  protected readonly signup = form(this.model, (path) => {
    required(path.name, { message: 'Enter your name.' });
    required(path.email, { message: 'Enter your email.' });
    email(path.email, { message: 'Enter an email like ada@example.com.' });
    required(path.password, { message: 'Choose a password.' });
    minLength(path.password, 12, { message: 'Use at least 12 characters.' });
    required(path.confirmPassword, { message: 'Enter your password again.' });
    validate(path.confirmPassword, ({ value, valueOf }) =>
      value() && value() !== valueOf(path.password)
        ? { kind: 'mismatch', message: "The passwords don't match." }
        : null,
    );
    required(path.terms, {
      message: 'Agree to the terms to create your account.',
    });
  });

  /** Whether the form was submitted valid, so the success message shows. */
  protected readonly created = signal(false);

  /**
   * Marks the fields touched, so errors show, and shows the success
   * message instead of navigating when the form is valid.
   *
   * @param event - The form's submit event.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.signup().markAsTouched();
    if (this.signup().valid()) {
      this.created.set(true);
    }
  }
}
