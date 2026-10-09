import { Component } from '@angular/core';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSlot,
} from '@/ui/input-otp/input-otp';
import { Label } from '@/ui/label/label';

/**
 * A recovery code of capital letters and digits: `allow` keeps them, and
 * the text keyboard opens on phones.
 */
@Component({
  selector: 'example-input-otp-pattern',
  imports: [InputOtp, InputOtpGroup, InputOtpInput, InputOtpSlot, Label],
  template: `
    <div class="grid gap-2">
      <label ndLabel for="input-otp-pattern-code">Recovery code</label>
      <div ndInputOtp [length]="6" allow="[A-Z0-9]" inputMode="text">
        <input
          ndInputOtpInput
          id="input-otp-pattern-code"
          autocapitalize="characters"
        />
        <div ndInputOtpGroup>
          @for (index of [0, 1, 2, 3, 4, 5]; track index) {
            <div ndInputOtpSlot [index]="index"></div>
          }
        </div>
      </div>
    </div>
  `,
})
export class InputOtpPatternExample {}
