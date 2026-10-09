import { Component } from '@angular/core';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/** A disabled input; its label dims with it. */
@Component({
  selector: 'example-input-disabled',
  imports: [Input, Label],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="input-disabled-email">Email</label>
      <input
        ndInput
        id="input-disabled-email"
        type="email"
        value="team@example.com"
        disabled
      />
    </div>
  `,
})
export class InputDisabledExample {}
