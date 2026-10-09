import { Component } from '@angular/core';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSlot,
} from '@/ui/input-otp/input-otp';

/** A disabled code input, such as while a code is being checked. */
@Component({
  selector: 'example-input-otp-disabled',
  imports: [InputOtp, InputOtpGroup, InputOtpInput, InputOtpSlot],
  template: `
    <div ndInputOtp [length]="4" defaultValue="2048" disabled>
      <input ndInputOtpInput aria-label="PIN" />
      <div ndInputOtpGroup>
        @for (index of [0, 1, 2, 3]; track index) {
          <div ndInputOtpSlot [index]="index"></div>
        }
      </div>
    </div>
  `,
})
export class InputOtpDisabledExample {}
