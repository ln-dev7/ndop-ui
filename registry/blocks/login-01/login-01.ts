import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';

/**
 * A sign-in page: a centered card with an email and password form,
 * validated with Signal Forms, a passkey alternative and a link to sign
 * up. Errors show once a field has been left, or the form submitted.
 */
@Component({
  selector: 'block-login-01',
  imports: [
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FormField,
    Input,
  ],
  template: `
    <main
      class="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10"
    >
      <section
        ndCard
        class="w-full max-w-sm"
        aria-labelledby="login-01-title"
        aria-describedby="login-01-description"
      >
        <div ndCardHeader>
          <h1 ndCardTitle id="login-01-title" class="text-xl">
            Sign in to your account
          </h1>
          <p ndCardDescription id="login-01-description">
            Enter your email below to sign in to your account.
          </p>
        </div>
        <div ndCardContent>
          <form novalidate (submit)="submit($event)">
            <div ndFieldGroup>
              <div ndField>
                <label ndFieldLabel for="login-01-email">Email</label>
                <input
                  ndInput
                  id="login-01-email"
                  type="email"
                  autocomplete="email"
                  placeholder="ada@example.com"
                  [formField]="login.email"
                />
                <div ndFieldError>
                  @for (error of login.email().errors(); track error.kind) {
                    <p>{{ error.message }}</p>
                  }
                </div>
              </div>
              <div ndField>
                <div class="flex items-center">
                  <label ndFieldLabel for="login-01-password">Password</label>
                  <a
                    href="/forgot-password"
                    class="ms-auto inline-block text-sm underline-offset-4 hover:underline"
                    >Forgot your password?</a
                  >
                </div>
                <input
                  ndInput
                  id="login-01-password"
                  type="password"
                  autocomplete="current-password"
                  [formField]="login.password"
                />
                <div ndFieldError>
                  @for (error of login.password().errors(); track error.kind) {
                    <p>{{ error.message }}</p>
                  }
                </div>
              </div>
              <div ndField>
                <button ndButton type="submit">Sign in</button>
                <button ndButton type="button" variant="outline">
                  Sign in with a passkey
                </button>
                <p ndFieldDescription class="text-center">
                  Don't have an account? <a href="/signup">Sign up</a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  `,
})
export class Login01Block {
  protected readonly model = signal({ email: '', password: '' });

  protected readonly login = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email.' });
    email(path.email, { message: 'Enter an email like ada@example.com.' });
    required(path.password, { message: 'Enter your password.' });
  });

  /**
   * Marks the fields touched, so errors show, instead of reloading.
   *
   * @param event - The form's submit event.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.login().markAsTouched();
  }
}
