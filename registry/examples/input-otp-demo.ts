import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSeparator,
  InputOtpSlot,
} from '@/ui/input-otp/input-otp';

/** A six-digit code in two groups of three. */
@Component({
  selector: 'example-input-otp-demo',
  imports: [
    InputOtp,
    InputOtpGroup,
    InputOtpInput,
    InputOtpSeparator,
    InputOtpSlot,
    NdIcon,
  ],
  template: `
    <div ndInputOtp [length]="6">
      <input ndInputOtpInput aria-label="Verification code" />
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
  `,
})
export class InputOtpDemoExample {}
