import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
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
 * A split-screen sign-in page: the brand and a Signal Forms sign-in form
 * with a passkey alternative on one side and, from large screens up, a
 * decorative Ndop cloth motif on the other. One column on smaller screens.
 */
@Component({
  selector: 'block-login-02',
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
    <main class="grid min-h-svh bg-background lg:grid-cols-2">
      <div class="flex flex-col gap-4 p-6 md:p-10">
        <div class="flex justify-center gap-2 md:justify-start">
          <a href="/" class="flex items-center gap-2 font-medium">
            <span
              class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                class="size-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M8 2 14 8 8 14 2 8Z" />
                <path d="M8 5.5 10.5 8 8 10.5 5.5 8Z" fill="currentColor" />
              </svg>
            </span>
            Ndop Inc.
          </a>
        </div>
        <div class="flex flex-1 items-center justify-center">
          <div class="w-full max-w-xs">
            <form novalidate (submit)="submit($event)">
              <div ndFieldGroup>
                <div class="flex flex-col items-center gap-1 text-center">
                  <h1 class="text-2xl font-bold">Sign in to your account</h1>
                  <p class="text-sm text-balance text-muted-foreground">
                    Enter your email below to sign in to your account.
                  </p>
                </div>
                <div ndField>
                  <label ndFieldLabel for="login-02-email">Email</label>
                  <input
                    ndInput
                    id="login-02-email"
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
                    <label ndFieldLabel for="login-02-password">Password</label>
                    <a
                      href="/forgot-password"
                      class="ms-auto text-sm underline-offset-4 hover:underline"
                      >Forgot your password?</a
                    >
                  </div>
                  <input
                    ndInput
                    id="login-02-password"
                    type="password"
                    autocomplete="current-password"
                    [formField]="login.password"
                  />
                  <div ndFieldError>
                    @for (
                      error of login.password().errors();
                      track error.kind
                    ) {
                      <p>{{ error.message }}</p>
                    }
                  </div>
                </div>
                <div ndField>
                  <button ndButton type="submit">Sign in</button>
                </div>
                <div ndFieldSeparator>
                  <span ndFieldSeparatorContent>Or continue with</span>
                </div>
                <div ndField>
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
        </div>
      </div>
      <div class="relative hidden overflow-hidden bg-muted lg:block">
        <svg
          aria-hidden="true"
          class="absolute inset-0 size-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern
              id="login-02-ndop"
              width="96"
              height="96"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M48 8 88 48 48 88 8 48Z"
                fill="none"
                class="stroke-primary"
                stroke-width="3"
                opacity="0.35"
              />
              <path
                d="M48 24 72 48 48 72 24 48Z"
                class="fill-primary"
                opacity="0.6"
              />
              <path d="M48 36 60 48 48 60 36 48Z" class="fill-muted" />
              <circle cx="0" cy="0" r="6" class="fill-primary" opacity="0.8" />
              <circle cx="96" cy="0" r="6" class="fill-primary" opacity="0.8" />
              <circle cx="0" cy="96" r="6" class="fill-primary" opacity="0.8" />
              <circle
                cx="96"
                cy="96"
                r="6"
                class="fill-primary"
                opacity="0.8"
              />
              <path
                d="M0 48h8M88 48h8M48 0v8M48 88v8"
                class="stroke-primary"
                stroke-width="3"
                opacity="0.35"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-02-ndop)" />
        </svg>
      </div>
    </main>
  `,
})
export class Login02Block {
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
