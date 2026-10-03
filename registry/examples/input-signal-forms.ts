import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/**
 * An input bound with Signal Forms. It turns invalid once the field is
 * touched and fails validation, and the label follows it.
 */
@Component({
  selector: 'example-input-signal-forms',
  imports: [Input, Label, FormField],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="input-signal-forms-email">Work email</label>
      <input
        ndInput
        id="input-signal-forms-email"
        type="email"
        placeholder="you@company.com"
        aria-describedby="input-signal-forms-hint"
        [formField]="account.email"
      />
      <p id="input-signal-forms-hint" class="text-muted-foreground text-sm">
        @if (account.email().touched() && account.email().invalid()) {
          Enter a valid email address.
        } @else {
          We'll send the invite here.
        }
      </p>
    </div>
  `,
})
export class InputSignalFormsExample {
  private readonly model = signal({ email: '' });

  protected readonly account = form(this.model, (path) => {
    required(path.email);
    email(path.email);
  });
}
