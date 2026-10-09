import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/ui/form-field/form-field';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSeparator,
  InputOtpSlot,
} from '@/ui/input-otp/input-otp';

/**
 * A verification step that checks the code as soon as it's complete,
 * without a submit button: a wrong code turns the field invalid and says
 * so. Here, 123456 is the right code.
 */
@Component({
  selector: 'example-input-otp-verify',
  imports: [
    Button,
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
    InputOtp,
    InputOtpGroup,
    InputOtpInput,
    InputOtpSeparator,
    InputOtpSlot,
    NdIcon,
  ],
  template: `
    <div ndField class="w-fit">
      <label ndFieldLabel for="input-otp-verify-code">
        Verification code
      </label>
      <p ndFieldDescription>We sent a code to ada&#64;example.com.</p>
      <div
        ndInputOtp
        [length]="6"
        [invalid]="status() === 'wrong'"
        [(value)]="code"
        (valueChange)="status.set('pending')"
        (completed)="verify($event)"
      >
        <input ndInputOtpInput id="input-otp-verify-code" />
        <div ndInputOtpGroup>
          @for (index of [0, 1, 2]; track index) {
            <div ndInputOtpSlot [index]="index"></div>
          }
        </div>
        <div ndInputOtpSeparator><svg ndIcon="minus"></svg></div>
        <div ndInputOtpGroup>
          @for (index of [3, 4, 5]; track index) {
            <div ndInputOtpSlot [index]="index"></div>
          }
        </div>
      </div>
      <p ndFieldError>That code isn't right. Check it, or send a new one.</p>
      <p class="text-sm" aria-live="polite">
        @if (status() === 'verified') {
          Verified.
        }
      </p>
      <button
        ndButton
        variant="link"
        class="justify-self-start px-0"
        (click)="resend()"
      >
        Send a new code
      </button>
    </div>
  `,
})
export class InputOtpVerifyExample {
  protected readonly code = signal('');
  protected readonly status = signal<'pending' | 'wrong' | 'verified'>(
    'pending',
  );

  /**
   * Checks a complete code.
   *
   * @param code - The code.
   */
  protected verify(code: string): void {
    this.status.set(code === '123456' ? 'verified' : 'wrong');
  }

  /** Clears the code, as after sending a new one. */
  protected resend(): void {
    this.code.set('');
    this.status.set('pending');
  }
}
