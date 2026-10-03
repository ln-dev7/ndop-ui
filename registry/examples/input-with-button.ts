import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';

/** An input and a button on one row, as in a newsletter sign-up. */
@Component({
  selector: 'example-input-with-button',
  imports: [Input, Button],
  template: `
    <form
      class="flex w-full max-w-sm items-center gap-2"
      (submit)="$event.preventDefault()"
    >
      <input ndInput type="email" placeholder="Email" aria-label="Email" />
      <button ndButton type="submit" variant="outline">Subscribe</button>
    </form>
  `,
})
export class InputWithButtonExample {}
