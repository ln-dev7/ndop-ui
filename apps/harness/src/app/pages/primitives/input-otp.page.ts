import { Component, signal } from '@angular/core';
import {
  NdInputOtp,
  NdInputOtpGroup,
  NdInputOtpInput,
  NdInputOtpSeparator,
  NdInputOtpSlot,
} from '@ndop/primitives/input-otp';
import { NdLabel } from '@ndop/primitives/label';

/**
 * Input OTP demo (`/primitives/input-otp`): a six-digit code in two
 * groups, which reports when it's complete.
 */
@Component({
  selector: 'harness-input-otp-demo',
  imports: [
    NdInputOtp,
    NdInputOtpInput,
    NdInputOtpGroup,
    NdInputOtpSlot,
    NdInputOtpSeparator,
    NdLabel,
  ],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Input OTP</h1>
      <label ndLabel for="code">Verification code</label>
      <div
        ndInputOtp
        [length]="6"
        [(value)]="code"
        (completed)="completed.set($event)"
        class="relative flex w-fit items-center gap-2"
      >
        <input
          ndInputOtpInput
          id="code"
          class="absolute inset-0 z-10 bg-transparent text-transparent caret-transparent outline-none"
        />
        <div ndInputOtpGroup class="flex">
          @for (index of [0, 1, 2]; track index) {
            <div ndInputOtpSlot [index]="index" [class]="slot"></div>
          }
        </div>
        <div ndInputOtpSeparator>-</div>
        <div ndInputOtpGroup class="flex">
          @for (index of [3, 4, 5]; track index) {
            <div ndInputOtpSlot [index]="index" [class]="slot"></div>
          }
        </div>
      </div>
      <p>Code: {{ code() }}</p>
      <p>Completed: {{ completed() }}</p>
    </main>
  `,
})
export default class InputOtpDemo {
  protected readonly slot =
    'flex size-9 items-center justify-center border border-foreground data-active:outline-2';
  protected readonly code = signal('');
  protected readonly completed = signal('');
}
