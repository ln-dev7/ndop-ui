import { Component } from '@angular/core';
import { Input } from '@/ui/input/input';

/** A plain email input. */
@Component({
  selector: 'example-input-demo',
  imports: [Input],
  template: `
    <input
      ndInput
      type="email"
      placeholder="Email"
      aria-label="Email"
      class="max-w-sm"
    />
  `,
})
export class InputDemoExample {}
